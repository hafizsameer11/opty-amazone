<?php

namespace App\Http\Controllers\Optical;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\StoreOrder;
use App\Models\User;
use Illuminate\Http\Request;

class DataController extends Controller
{
    private function cursor(Request $r): array
    {
        return $r->validate(['after_id' => 'nullable|integer|min:0', 'through_id' => 'nullable|integer|min:0']);
    }

    private function page($q, array $d, callable $map): array
    {
        $through = isset($d['through_id']) ? (int) $d['through_id'] : ((clone $q)->max('id') ?? 0);
        $rows = $q->where('id', '>', (int) ($d['after_id'] ?? 0))->where('id', '<=', $through)->orderBy('id')->limit(101)->get();
        $more = $rows->count() > 100;
        $rows = $rows->take(100);

        return ['data' => $rows->map($map)->values(), 'through_id' => $through, 'next_id' => $more ? $rows->last()->id : null, 'source' => 'vista_express', 'observed_at' => now()->toIso8601String()];
    }

    public function metadata(Request $r)
    {
        return ['data' => ['currency' => config('optical.currency'), 'product_types' => ['frame', 'sunglasses', 'contact_lens', 'eye_hygiene', 'accessory'], 'categories' => Category::where('is_active', true)->orderBy('name')->get(['id', 'name', 'parent_id']),
            'field_mapping' => ['name' => 'name', 'sku' => 'seller_sku', 'description' => 'description', 'color' => 'frame_color', 'price' => 'price (EUR decimal)', 'allocated_quantity' => 'initial stock_quantity'],
            'publication_policy' => 'Each Optical Shop color/model SKU is a separate Vista listing. Existing Vista listings are never matched by name or SKU. Subsequent stock allocations add a quantity; they never replace Vista stock.']];
    }

    public static function product(Product $p): array
    {
        return [...$p->only(['id', 'name', 'sku', 'product_type', 'category_id', 'description', 'price', 'stock_quantity', 'stock_status', 'images', 'is_active', 'is_approved', 'is_muted', 'frame_shape', 'frame_material', 'frame_color', 'gender', 'updated_at', 'deleted_at']),
            'currency' => config('optical.currency'), 'visible' => ! $p->trashed() && Product::visibleToBuyers()->whereKey($p->id)->exists(),
            'variants' => $p->variants()->get(['id', 'color_name', 'color_code', 'price', 'stock_quantity', 'stock_status'])->map->toArray(),
            'sizes' => $p->frameSizes()->get(['id', 'product_variant_id', 'stock_quantity', 'stock_status'])->map->toArray()];
    }

    public function products(Request $r)
    {
        return $this->page(Product::withTrashed()->where('store_id', $r->attributes->get('optical_store')->id), $this->cursor($r), fn ($p) => self::product($p));
    }

    public function orders(Request $r)
    {
        return $this->page(StoreOrder::where('store_id', $r->attributes->get('optical_store')->id)->with(['order' => fn ($q) => $q->withTrashed(), 'items']), $this->cursor($r), fn ($o) => [
            ...$o->only(['id', 'status', 'subtotal', 'delivery_fee', 'total', 'payment_status', 'created_at', 'updated_at']), 'currency' => config('optical.currency'),
            'order_number' => $o->order?->order_no, 'customer_id' => $o->order?->user_id,
            'items' => $o->items->map->only(['id', 'product_id', 'variant_id', 'quantity', 'price', 'line_total', 'product_name', 'product_sku'])->all()]);
    }

    public function customers(Request $r)
    {
        $store = $r->attributes->get('optical_store')->id;
        $q = User::where('role', 'buyer')->whereExists(fn ($query) => $query->selectRaw('1')->from('orders')->join('store_orders', 'store_orders.order_id', '=', 'orders.id')->whereColumn('orders.user_id', 'users.id')->where('store_orders.store_id', $store));

        return $this->page($q, $this->cursor($r), fn ($u) => $u->only(['id', 'name', 'email', 'phone', 'updated_at']));
    }
}
