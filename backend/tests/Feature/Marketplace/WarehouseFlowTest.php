<?php

namespace Tests\Feature\Marketplace;

use App\Models\{SellerWallet, Store, User, WarehouseCategory, WarehouseProduct};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
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
            'image_path' => 'warehouse/products/warehouse-acetate-frame.jpg',
            'color' => 'Black', 'temple_size' => '145mm', 'lens_size' => '52mm', 'bridge_size' => '18mm', 'is_active' => true,
        ]);
    }

    public function test_warehouse_product_images_use_the_public_storage_url_for_admin_and_seller_responses(): void
    {
        $this->assertStringEndsWith('/storage/warehouse/products/warehouse-acetate-frame.jpg', (string) $this->product->fresh()->image_url);

        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/warehouse/products')
            ->assertOk()
            ->assertJsonStructure(['data' => ['products' => ['data' => [['image_path', 'image_url']]]]]);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/warehouse/products')
            ->assertOk()
            ->assertJsonStructure(['data' => ['data' => [['image_path', 'image_url']]]]);
    }

    public function test_seller_wallet_warehouse_checkout_decrements_only_warehouse_stock_and_creates_no_store_order(): void
    {
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/warehouse/cart/items', ['warehouse_product_id' => $this->product->id, 'quantity' => 10])
            ->assertOk()->assertJsonPath('data.total', '105.00');
        $idempotencyKey = (string) Str::uuid();
        $response = $this->postJson('/api/seller/warehouse/checkout', ['idempotency_key' => $idempotencyKey])
            ->assertCreated()->assertJsonPath('data.status', 'pending')->assertJsonPath('data.payment_status', 'paid');

        $orderId = $response->json('data.id');
        $this->assertSame(90, $this->product->fresh()->stock_quantity);
        $this->assertSame('145.00', SellerWallet::where('store_id', $this->store->id)->value('available_balance'));
        $this->assertDatabaseHas('warehouse_orders', ['id' => $orderId, 'seller_id' => $this->seller->id, 'total' => 105]);
        $this->assertDatabaseHas('seller_wallet_entries', ['type' => 'warehouse_purchase']);
        $this->assertDatabaseCount('store_orders', 0);
        $this->getJson('/api/seller/warehouse/orders')->assertOk()->assertJsonPath('data.data.0.id', $orderId);
        // A network retry must return the original warehouse order without
        // charging the Seller Wallet or decrementing stock a second time.
        $this->postJson('/api/seller/warehouse/checkout', ['idempotency_key' => $idempotencyKey])
            ->assertCreated()->assertJsonPath('data.id', $orderId);
        $this->assertSame(90, $this->product->fresh()->stock_quantity);
        $this->assertSame('145.00', SellerWallet::where('store_id', $this->store->id)->value('available_balance'));
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
        $this->assertSame(100, $this->product->fresh()->stock_quantity);
    }

    public function test_admin_inventory_and_seller_browse_cart_order_flow_are_isolated_from_buyers(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/warehouse/dashboard')->assertOk()
            ->assertJsonPath('data.stats.total_products', 1);
        $categoryId = $this->postJson('/api/admin/warehouse/categories', [
            'name' => 'Monthly Contact Lenses', 'type' => 'contact_lenses', 'description' => 'Wholesale contact lenses',
        ])->assertCreated()->json('data.id');
        $this->putJson('/api/admin/warehouse/categories/'.$categoryId, ['name' => 'Monthly Lens Stock'])
            ->assertOk()->assertJsonPath('data.name', 'Monthly Lens Stock');

        $created = $this->postJson('/api/admin/warehouse/products', [
            'warehouse_category_id' => $categoryId, 'name' => 'Monthly Clear Lens', 'sku' => 'WH-CL-001',
            'price' => 12.50, 'shipping_fee' => 1.50, 'stock_quantity' => 8, 'low_stock_threshold' => 2,
            'is_active' => 'true',
            'details' => ['brand' => 'Vista', 'material' => 'Hydrogel', 'replacement_frequency' => 'Monthly', 'pack_size' => '6', 'base_curve' => '8.6', 'diameter' => '14.2', 'water_content' => '55%'],
        ])->assertCreated()->assertJsonPath('data.is_active', true);
        $productId = $created->json('data.id');
        $this->postJson('/api/admin/warehouse/products', [
            'warehouse_category_id' => $categoryId, 'name' => 'Invalid prescription stock', 'sku' => 'WH-INVALID-001',
            'price' => 1, 'stock_quantity' => 1, 'details' => ['sph' => '-2.00'],
        ])->assertUnprocessable()->assertJsonValidationErrors('details');
        $this->postJson('/api/admin/warehouse/products/'.$productId, ['stock_quantity' => 9])
            ->assertOk()->assertJsonPath('data.stock_quantity', 9);
        $this->getJson('/api/admin/warehouse/products?availability=in_stock')->assertOk();

        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/warehouse/products?type=contact_lenses')->assertOk()
            ->assertJsonPath('data.products.data.0.id', $productId);
        $this->getJson('/api/seller/warehouse/products/'.$productId)->assertOk()
            ->assertJsonPath('data.id', $productId);
        $cartResponse = $this->postJson('/api/seller/warehouse/cart/items', ['warehouse_product_id' => $productId, 'quantity' => 1])
            ->assertOk()->assertJsonPath('data.total', '14.00');
        $cartItemId = $cartResponse->json('data.items.0.id');
        $this->putJson('/api/seller/warehouse/cart/items/'.$cartItemId, ['quantity' => 2])
            ->assertOk()->assertJsonPath('data.total', '26.50');
        $this->deleteJson('/api/seller/warehouse/cart/items/'.$cartItemId)
            ->assertOk()->assertJsonPath('data.items', []);
        $this->postJson('/api/seller/warehouse/cart/items', ['warehouse_product_id' => $productId, 'quantity' => 1])->assertOk();
        $orderId = $this->postJson('/api/seller/warehouse/checkout', [
            'idempotency_key' => (string) Str::uuid(),
            'shipping_address' => ['line_1' => 'Seller Warehouse Road 1', 'city' => 'Milan'],
        ])->assertCreated()->json('data.id');
        $this->getJson('/api/seller/warehouse/orders')->assertOk()->assertJsonPath('data.data.0.id', $orderId);
        $this->getJson('/api/seller/warehouse/orders/'.$orderId)->assertOk()
            ->assertJsonPath('data.shipping_address.city', 'Milan');

        Sanctum::actingAs($admin);
        $this->getJson('/api/admin/warehouse/orders?status=pending')->assertOk()->assertJsonPath('data.data.0.id', $orderId);
        $this->getJson('/api/admin/warehouse/orders/'.$orderId)->assertOk()->assertJsonPath('data.id', $orderId);
        $this->putJson('/api/admin/warehouse/orders/'.$orderId, ['status' => 'confirmed'])->assertOk()
            ->assertJsonPath('data.status', 'confirmed');
        $this->putJson('/api/admin/warehouse/orders/'.$orderId, ['status' => 'shipped', 'shipping_carrier' => 'DHL', 'tracking_number' => 'WH-TRACK-1'])
            ->assertOk()->assertJsonPath('data.status', 'shipped')->assertJsonPath('data.tracking_number', 'WH-TRACK-1');
        $this->putJson('/api/admin/warehouse/orders/'.$orderId, ['status' => 'delivered'])->assertOk()
            ->assertJsonPath('data.status', 'delivered');
        $this->deleteJson('/api/admin/warehouse/products/'.$productId)->assertOk();
        $this->assertSoftDeleted('warehouse_products', ['id' => $productId]);

        $buyer = User::factory()->create(['role' => 'buyer']);
        Sanctum::actingAs($buyer);
        $this->getJson('/api/seller/warehouse/products')->assertForbidden();
        $this->getJson('/api/admin/warehouse/dashboard')->assertForbidden();
    }

    public function test_warehouse_migration_recovers_from_a_partial_mysql_style_attempt(): void
    {
        // A failed MySQL DDL statement can leave earlier tables in place while
        // Laravel has not yet written this migration to the migrations table.
        // Reproduce that state by removing its final cart-item index and its
        // migration record, then ensure the migration resumes cleanly.
        Schema::table('warehouse_cart_items', fn ($table) => $table->dropUnique('wh_cart_item_cart_product_uq'));
        DB::table('migrations')->where('migration', '2026_09_21_000005_create_warehouse_system')->delete();
        $this->assertFalse(Schema::hasIndex('warehouse_cart_items', ['warehouse_cart_id', 'warehouse_product_id'], 'unique'));

        $exitCode = Artisan::call('migrate', [
            '--path' => database_path('migrations/2026_09_21_000005_create_warehouse_system.php'),
            '--realpath' => true,
            '--force' => true,
        ]);

        $this->assertSame(0, $exitCode, Artisan::output());
        $this->assertTrue(Schema::hasIndex('warehouse_cart_items', ['warehouse_cart_id', 'warehouse_product_id'], 'unique'));
        $this->assertDatabaseHas('warehouse_categories', ['slug' => 'eyeglasses', 'type' => 'eyeglasses']);
        $this->assertDatabaseHas('migrations', ['migration' => '2026_09_21_000005_create_warehouse_system']);
    }
}
