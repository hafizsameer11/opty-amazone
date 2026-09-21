<?php

namespace Tests\Feature\Marketplace;

use App\Models\{SellerWallet, Store, User, WarehouseCategory, WarehouseProduct};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WarehouseFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $seller;
    private Store $store;
    private WarehouseProduct $product;

    protected function beforeRefreshingDatabase(): void
    {
        Event::listen(\Illuminate\Database\Events\MigrationStarted::class, function ($event) {
            if (str_contains((new \ReflectionClass($event->migration))->getFileName(), 'require_color_on_frame_sizes')
                && ! Schema::hasColumn('frame_sizes', 'product_variant_id')) {
                Schema::table('frame_sizes', fn ($table) => $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete());
            }
        });
    }

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.key' => 'base64:'.base64_encode(random_bytes(32))]);
        $this->seller = User::factory()->create(['role' => 'seller']);
        $this->store = Store::factory()->create(['user_id' => $this->seller->id, 'is_active' => true, 'status' => 'active']);
        SellerWallet::create(['store_id' => $this->store->id, 'available_balance' => 250]);
        $category = WarehouseCategory::where('type', 'eyeglasses')->firstOrFail();
        $this->product = WarehouseProduct::create([
            'warehouse_category_id' => $category->id, 'name' => 'Warehouse acetate frame', 'sku' => 'WH-FRAME-001',
            'price' => 10, 'shipping_fee' => 5, 'stock_quantity' => 100, 'low_stock_threshold' => 10,
            'color' => 'Black', 'temple_size' => '145mm', 'lens_size' => '52mm', 'bridge_size' => '18mm', 'is_active' => true,
        ]);
    }

    public function test_seller_wallet_warehouse_checkout_decrements_only_warehouse_stock_and_creates_no_store_order(): void
    {
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/warehouse/cart/items', ['warehouse_product_id' => $this->product->id, 'quantity' => 10])
            ->assertOk()->assertJsonPath('data.total', '105.00');
        $response = $this->postJson('/api/seller/warehouse/checkout', ['idempotency_key' => (string) Str::uuid()])
            ->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.payment_status', 'paid');

        $orderId = $response->json('data.id');
        $this->assertSame(90, $this->product->fresh()->stock_quantity);
        $this->assertSame('145.00', SellerWallet::where('store_id', $this->store->id)->value('available_balance'));
        $this->assertDatabaseHas('warehouse_orders', ['id' => $orderId, 'seller_id' => $this->seller->id, 'total' => 105]);
        $this->assertDatabaseHas('seller_wallet_entries', ['type' => 'warehouse_purchase']);
        $this->assertDatabaseCount('store_orders', 0);
        $this->getJson('/api/seller/warehouse/orders')->assertOk()->assertJsonPath('data.data.0.id', $orderId);
    }

    public function test_checkout_rejects_stock_above_available_and_admin_cancellation_refunds_the_wallet(): void
    {
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/warehouse/cart/items', ['warehouse_product_id' => $this->product->id, 'quantity' => 101])
            ->assertUnprocessable()->assertJsonValidationErrors('quantity');

        $this->postJson('/api/seller/warehouse/cart/items', ['warehouse_product_id' => $this->product->id, 'quantity' => 2])->assertOk();
        $orderId = $this->postJson('/api/seller/warehouse/checkout', ['idempotency_key' => (string) Str::uuid()])->assertCreated()->json('data.id');
        $this->assertSame('225.00', SellerWallet::where('store_id', $this->store->id)->value('available_balance'));

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->putJson('/api/admin/warehouse/orders/'.$orderId, ['status' => 'cancelled', 'shipping_carrier' => 'DHL'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('data.payment_status', 'refunded');
        $this->assertSame('250.00', SellerWallet::where('store_id', $this->store->id)->value('available_balance'));
        $this->assertDatabaseHas('seller_wallet_entries', ['type' => 'warehouse_refund']);
    }
}
