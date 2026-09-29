<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\Crm\CrmWarehouseController;
use App\Models\WarehouseCategory;
use App\Models\WarehouseProduct;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Exposes the real exception behind a failing /api/crm/warehouse response.
 *
 * With APP_DEBUG off the API only ever returns "Server Error", so this walks
 * the controller one block at a time and prints the exception class, message
 * and origin instead. Read-only: it never writes.
 */
class DiagnoseCrmWarehouse extends Command
{
    protected $signature = 'crm:diagnose-warehouse';
    protected $description = 'Report why the CRM warehouse overview fails, including the underlying exception.';

    public function handle(): int
    {
        $this->line('');
        $this->line('  <options=bold>CRM warehouse diagnostics</>');
        $this->line('');

        if (! Schema::hasTable('warehouse_products')) {
            $this->error('  warehouse_products table is missing. Run: php artisan migrate');

            return self::FAILURE;
        }

        $this->heading('Schema');

        $hasDrafts = Schema::hasColumn('warehouse_products', 'is_draft');

        $this->line('  warehouse_products rows   : '.WarehouseProduct::withTrashed()->count());
        $this->line('  is_draft column present  : '.($hasDrafts ? 'yes' : 'NO (draft migration not applied)'));

        if ($hasDrafts) {
            $nulls = DB::table('warehouse_products')->whereNull('is_draft')->count();

            $this->line('  is_draft = 1 (draft)     : '.DB::table('warehouse_products')->where('is_draft', true)->count());
            $this->line('  is_draft = 0 (published) : '.DB::table('warehouse_products')->where('is_draft', false)->count());
            $this->line('  is_draft IS NULL         : '.$nulls);

            if ($nulls > 0) {
                $this->warn('  A NULL is_draft is excluded by "where is_draft = 0", so stock and product');
                $this->warn('  counts can read as zero even though the rows are published. Backfill with:');
                $this->line('');
                $this->line('    UPDATE warehouse_products SET is_draft = 0 WHERE is_draft IS NULL;');
                $this->line('');
            }
        }

        $controller = new CrmWarehouseController();
        $invoke = function (string $method) use ($controller) {
            $fn = new \ReflectionMethod($controller, $method);
            $fn->setAccessible(true);

            return $fn->invoke($controller);
        };

        $this->heading('Blocks');

        $this->block('published product counts', static function () use ($hasDrafts) {
            $query = WarehouseProduct::where('is_active', true);
            if ($hasDrafts) {
                $query->where('is_draft', false);
            }

            return sprintf('count=%d stock=%d', (clone $query)->count(), (int) (clone $query)->sum('stock_quantity'));
        });

        $this->block('low stock list', static fn () => (string) WarehouseProduct::where('is_active', true)
            ->where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->orderBy('stock_quantity')
            ->limit(20)
            ->get(['id', 'name', 'sku', 'stock_quantity', 'low_stock_threshold'])
            ->count());

        // The model declares $appends = ['image_url', 'availability'] and the
        // availability accessor reads is_active, which this partial select does
        // not load. Force the accessor to run so any error surfaces here.
        $this->block('partial-select accessor', static function () {
            $product = WarehouseProduct::query()
                ->get(['id', 'name', 'sku', 'stock_quantity', 'low_stock_threshold'])
                ->first();

            return $product ? 'availability='.$product->getAttribute('availability') : 'no rows';
        });

        $this->block('full model toArray', static function () {
            $product = WarehouseProduct::query()->first();

            return $product ? 'serialized ok ('.count($product->toArray()).' fields)' : 'no rows';
        });

        $this->block('stock_by_category', static fn () => (string) count($invoke('stockByCategory')));
        $this->block('orders_trend', static fn () => (string) count($invoke('ordersTrend')));
        $this->block('top_sellers', static fn () => (string) count($invoke('topSellers')));
        $this->block('warehouse categories', static fn () => (string) WarehouseCategory::count());

        $this->heading('Full endpoint');

        try {
            $response = $controller->overview(Request::create('/', 'GET'));
            $payload = $response->getData(true);

            $this->line('  HTTP '.$response->getStatusCode().'  success='.var_export($payload['success'] ?? null, true));

            foreach (($payload['data']['stats'] ?? []) as $key => $value) {
                $this->line(sprintf('    %-24s %s', $key, var_export($value, true)));
            }
        } catch (\Throwable $e) {
            $this->reportThrowable($e);

            return self::FAILURE;
        }

        $this->line('');
        $this->line('  <fg=green>All blocks completed.</>');
        $this->line('');

        return self::SUCCESS;
    }

    private function heading(string $title): void
    {
        $this->line('');
        $this->line('  <options=bold>'.$title.'</>');
    }

    private function block(string $label, callable $fn): void
    {
        try {
            $result = $fn();
            $this->line("  <fg=green>ok  </> {$label}".($result === '' || $result === null ? '' : "  ({$result})"));
        } catch (\Throwable $e) {
            $this->line("  <fg=red>FAIL</> {$label}");
            $this->reportThrowable($e);
        }
    }

    private function reportThrowable(\Throwable $e): void
    {
        $this->line('        '.$e::class);
        $this->line('        '.$e->getMessage());

        foreach ($e->getTrace() as $frame) {
            if (isset($frame['file']) && ! str_contains(str_replace('\\', '/', $frame['file']), '/vendor/')) {
                $this->line('        at '.$frame['file'].':'.($frame['line'] ?? '?'));
                break;
            }
        }

        $previous = $e->getPrevious();
        if ($previous) {
            $this->line('        caused by '.$previous::class.': '.substr($previous->getMessage(), 0, 400));
        }
    }
}
