<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('model_code', 100)->nullable()->after('sku');
            $table->index(['store_id', 'model_code'], 'products_store_model_code_index');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('barcode')->nullable()->unique()->after('color_code');
            $table->string('purchase_code')->nullable()->unique()->after('barcode');
        });

        // Preserve existing catalogues: an older eyewear product receives a
        // stable shared model code, and every existing variant receives its
        // own identifiers. New records use the same semantics in the service.
        DB::table('products')
            ->select(['id', 'sku'])
            ->whereIn('product_type', ['frame', 'sunglasses'])
            ->where(function ($query) {
                $query->whereNull('model_code')->orWhere('model_code', '');
            })
            ->orderBy('id')
            ->chunkById(100, function ($products) {
                foreach ($products as $product) {
                    $sku = strtoupper((string) preg_replace('/[^A-Z0-9]+/', '-', (string) $product->sku));
                    $modelCode = trim('MODEL-'.trim($sku, '-'), '-');
                    DB::table('products')->where('id', $product->id)->update([
                        'model_code' => substr($modelCode !== 'MODEL' ? $modelCode : 'MODEL-'.$product->id, 0, 100),
                    ]);
                }
            });

        DB::table('product_variants')
            ->select(['id', 'barcode', 'purchase_code'])
            ->where(function ($query) {
                $query->whereNull('barcode')->orWhere('barcode', '')
                    ->orWhereNull('purchase_code')->orWhere('purchase_code', '');
            })
            ->orderBy('id')
            ->chunkById(100, function ($variants) {
                foreach ($variants as $variant) {
                    $changes = [];
                    if (blank($variant->barcode)) {
                        $changes['barcode'] = 'BC-'.$variant->id;
                    }
                    if (blank($variant->purchase_code)) {
                        $changes['purchase_code'] = 'PC-'.$variant->id;
                    }
                    if ($changes !== []) {
                        DB::table('product_variants')->where('id', $variant->id)->update($changes);
                    }
                }
            });

        // Only eyewear colour prices are retired. ProductVariant is also used
        // by older contact-lens pack records, whose pack pricing must remain
        // intact while those products are migrated to the newer pack model.
        DB::table('product_variants')
            ->whereIn('product_id', function ($query) {
                $query->select('id')
                    ->from('products')
                    ->whereIn('product_type', ['frame', 'sunglasses']);
            })
            ->update(['price' => null]);
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique(['barcode']);
            $table->dropUnique(['purchase_code']);
            $table->dropColumn(['barcode', 'purchase_code']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_store_model_code_index');
            $table->dropColumn('model_code');
        });
    }
};
