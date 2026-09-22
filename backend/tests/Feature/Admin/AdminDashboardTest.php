<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PlatformLedgerEntry;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\WarehouseCategory;
use App\Models\WarehouseOrder;
use App\Models\WarehouseProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dashboard_returns_a_complete_live_overview_contract(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $store = Store::create(['user_id' => $seller->id, 'name' => 'Vision Pro', 'slug' => (string) Str::uuid(), 'status' => 'active', 'is_active' => true]);
        $product = Product::create(['store_id' => $store->id, 'name' => 'Classic Frame', 'slug' => (string) Str::uuid(), 'sku' => 'FRAME-100',
            'price' => 100, 'stock_quantity' => 20, 'stock_status' => 'in_stock', 'is_approved' => true, 'is_active' => true,
            'product_type' => 'accessory', 'shipping_type' => 'fixed']);
        $order = Order::create(['user_id' => $buyer->id, 'order_no' => 'DASH-ORDER-1', 'payment_status' => 'paid', 'items_total' => 100, 'grand_total' => 100]);
        $storeOrder = StoreOrder::create(['order_id' => $order->id, 'store_id' => $store->id, 'status' => 'processing', 'subtotal' => 100, 'total' => 100]);
        OrderItem::create(['store_order_id' => $storeOrder->id, 'product_id' => $product->id, 'quantity' => 2, 'price' => 50, 'line_total' => 100, 'product_name' => $product->name, 'product_sku' => $product->sku]);
        PlatformLedgerEntry::create(['reference' => 'dashboard-ad-spend', 'type' => 'boost_ad_spend', 'amount' => 25]);
        $category = WarehouseCategory::query()->firstOrFail();
        WarehouseProduct::create(['warehouse_category_id' => $category->id, 'name' => 'Warehouse Frame', 'sku' => 'WH-FRAME-1', 'price' => 50, 'stock_quantity' => 10, 'low_stock_threshold' => 4, 'is_active' => true, 'is_draft' => false]);
        WarehouseOrder::create(['order_number' => 'WH-DASH-1', 'seller_id' => $seller->id, 'store_id' => $store->id, 'status' => 'processing', 'payment_status' => 'paid', 'subtotal' => 50, 'total' => 50, 'paid_at' => now()]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/dashboard?months=6')
            ->assertOk()
            ->assertJsonPath('data.range_months', 6)
            ->assertJsonPath('data.totals.total_users', 2)
            ->assertJsonPath('data.totals.total_sellers', 1)
            ->assertJsonPath('data.totals.total_buyers', 1)
            ->assertJsonPath('data.totals.total_products', 1)
            ->assertJsonPath('data.totals.total_orders', 1)
            ->assertJsonPath('data.totals.total_revenue', 175)
            ->assertJsonPath('data.totals.order_revenue', 100)
            ->assertJsonPath('data.totals.ad_revenue', 25)
            ->assertJsonPath('data.totals.warehouse_revenue', 50)
            ->assertJsonPath('data.warehouse.total_stock', 10)
            ->assertJsonPath('data.best_selling_products.0.name', 'Classic Frame')
            ->assertJsonStructure([
                'data' => [
                    'period_start',
                    'totals' => ['total_users', 'total_sellers', 'total_buyers', 'total_products', 'total_orders', 'total_revenue', 'order_revenue', 'ad_revenue', 'warehouse_revenue'],
                    'changes' => ['users', 'sellers', 'buyers', 'products', 'orders', 'revenue'],
                    'revenue_sources' => [['key', 'value']],
                    'revenue_trend' => [['month', 'label', 'order_revenue', 'ad_revenue', 'warehouse_revenue', 'orders', 'warehouse_orders']],
                    'order_statuses',
                    'warehouse' => ['total_stock', 'low_stock', 'orders', 'trend'],
                    'best_selling_products',
                    'recent_activity',
                    'operations' => ['open_orders', 'pending_seller_approvals', 'pending_product_reviews', 'open_support_tickets'],
                ],
            ]);
    }
}
