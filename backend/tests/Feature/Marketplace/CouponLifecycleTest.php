<?php

namespace Tests\Feature\Marketplace;

use App\Models\{Cart, CartItem, Category, Coupon, CouponUsage, Order, Product, ProductVariant, Store, StoreOrder, User, UserAddress};
use App\Services\Coupon\CouponService;
use App\Services\Coupon\CouponValidationException;
use App\Services\Order\OrderService;
use App\Services\Marketplace\{BuyerWalletService, OrderTotalsService, PaymentService, RefundService};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CouponLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private Store $storeA;
    private Store $storeB;
    private Product $productA;
    private Product $productB;
    private Cart $cart;

    protected function beforeRefreshingDatabase(): void
    {
        // Existing historical migration expects this FK during a disposable
        // fresh SQLite migration, exactly as the campaign test suite does.
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
        $this->buyer = User::factory()->create(['role' => 'buyer']);
        $sellerA = User::factory()->create(['role' => 'seller']);
        $sellerB = User::factory()->create(['role' => 'seller']);
        $this->storeA = Store::factory()->create(['user_id' => $sellerA->id, 'is_active' => true, 'status' => 'active']);
        $this->storeB = Store::factory()->create(['user_id' => $sellerB->id, 'is_active' => true, 'status' => 'active']);
        $category = Category::factory()->create(['is_active' => true]);
        $this->productA = Product::factory()->create(['store_id' => $this->storeA->id, 'category_id' => $category->id, 'price' => 100, 'stock_quantity' => 100, 'stock_status' => 'in_stock', 'is_active' => true, 'is_approved' => true, 'is_muted' => false]);
        $this->productB = Product::factory()->create(['store_id' => $this->storeB->id, 'category_id' => $category->id, 'price' => 50, 'stock_quantity' => 100, 'stock_status' => 'in_stock', 'is_active' => true, 'is_approved' => true, 'is_muted' => false]);
        $this->cart = Cart::create(['user_id' => $this->buyer->id]);
        CartItem::create(['cart_id' => $this->cart->id, 'product_id' => $this->productA->id, 'store_id' => $this->storeA->id, 'quantity' => 1, 'price' => 100]);
        CartItem::create(['cart_id' => $this->cart->id, 'product_id' => $this->productB->id, 'store_id' => $this->storeB->id, 'quantity' => 1, 'price' => 50]);
    }

    private function coupon(array $overrides = []): Coupon
    {
        return Coupon::create(array_replace([
            'store_id' => $this->storeA->id, 'code' => 'SAVE20', 'discount_type' => 'percentage', 'discount_value' => 20,
            'scope' => 'store', 'status' => 'active', 'is_active' => true, 'is_public' => true,
        ], $overrides));
    }

    public function test_coupon_is_case_insensitive_and_never_discounts_another_seller(): void
    {
        // Percentage coupons deliberately have no maximum-discount cap. Their
        // percentage is applied to the eligible seller lines only.
        $this->assertFalse(Schema::hasColumn('coupons', 'max_discount'));
        $this->coupon();
        $quote = app(CouponService::class)->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'save20']);

        $this->assertSame('20.00', $quote['coupon_discount']);
        $this->assertSame('80.00', $quote['stores'][$this->storeA->id]['final_before_shipping']);
        $this->assertSame('50.00', $quote['stores'][$this->storeB->id]['final_before_shipping']);
        $this->assertSame('0.00', $quote['stores'][$this->storeB->id]['coupon_discount']);
    }

    public function test_product_category_and_variant_scopes_use_real_cart_lines(): void
    {
        $service = app(CouponService::class);
        $coupon = $this->coupon(['code' => 'PRODUCT10', 'discount_type' => 'fixed_amount', 'discount_value' => 10, 'scope' => 'products']);
        $service->syncTargets($coupon, ['scope' => 'products', 'product_ids' => [$this->productA->id]]);
        $this->assertSame('10.00', $service->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'product10'])['coupon_discount']);

        $coupon->update(['code' => 'CATEGORY15', 'scope' => 'categories', 'discount_value' => 15]);
        $service->syncTargets($coupon, ['scope' => 'categories', 'category_ids' => [$this->productA->category_id]]);
        $this->assertSame('15.00', $service->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'category15'])['coupon_discount']);

        $variant = ProductVariant::create(['product_id' => $this->productA->id, 'color_name' => 'Blue', 'price' => 100, 'stock_quantity' => 10, 'stock_status' => 'in_stock']);
        CartItem::where('product_id', $this->productA->id)->update(['variant_id' => $variant->id]);
        $coupon->update(['code' => 'VARIANT25', 'scope' => 'variants', 'discount_type' => 'percentage', 'discount_value' => 25]);
        $service->syncTargets($coupon, ['scope' => 'variants', 'variant_ids' => [$variant->id]]);
        $this->assertSame('25.00', $service->quoteCart($this->cart->fresh(), $this->buyer, [$this->storeA->id => 'variant25'])['coupon_discount']);
    }

    public function test_coupon_schedule_uses_the_sellers_timezone_and_run_now_activates_immediately(): void
    {
        Carbon::setTestNow('2026-09-21 06:55:00 UTC');

        try {
            Sanctum::actingAs($this->storeA->user);
            $scheduledId = $this->postJson('/api/seller/coupons', [
                'code' => 'PKTIME10',
                'discount_type' => 'percentage',
                'discount_value' => 10,
                'scope' => 'products',
                'product_ids' => [$this->productA->id],
                'launch_mode' => 'schedule',
                'schedule_timezone' => 'Asia/Karachi',
                // 12:00 in Pakistan is 07:00 UTC. The API also accepts the
                // browser's UTC ISO value, which is what the Seller UI sends.
                'starts_at' => '2026-09-21T12:00:00',
                'ends_at' => '2026-09-21T13:00:00',
            ])->assertCreated()->json('data.id');

            $scheduled = Coupon::findOrFail($scheduledId);
            $this->assertSame('Asia/Karachi', $scheduled->schedule_timezone);
            $this->assertSame('scheduled', $scheduled->status);
            $this->assertSame('2026-09-21 07:00', $scheduled->starts_at->utc()->format('Y-m-d H:i'));

            Carbon::setTestNow('2026-09-21 07:00:00 UTC');
            $this->assertTrue($scheduled->fresh()->isAvailableNow());
            $this->assertSame('10.00', app(CouponService::class)->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'pktime10'])['coupon_discount']);
            $this->assertSame(1, app(CouponService::class)->activateDueCoupons());
            $this->assertSame('active', $scheduled->fresh()->status);

            Carbon::setTestNow('2026-09-21 08:00:00 UTC');
            $runNowId = $this->postJson('/api/seller/coupons', [
                'code' => 'RUNNOW10',
                'description' => 'Complete Seller form payload',
                'discount_type' => 'percentage',
                'discount_value' => 10,
                'min_order_amount' => 25,
                'usage_limit' => 50,
                'usage_per_user' => 2,
                'scope' => 'products',
                'product_ids' => [$this->productA->id],
                'launch_mode' => 'run_now',
                'schedule_timezone' => 'Asia/Karachi',
                'starts_at' => '2030-01-01T00:00:00',
                'ends_at' => '2026-09-22T08:00:00.000Z',
                'is_active' => true,
                'status' => 'active',
                'is_public' => true,
                'followers_only' => false,
                'first_order_only' => false,
            ])->assertCreated()->json('data.id');

            $runNow = Coupon::findOrFail($runNowId);
            $this->assertSame('active', $runNow->status);
            $this->assertTrue($runNow->is_active);
            $this->assertSame('2026-09-21 08:00', $runNow->starts_at->utc()->format('Y-m-d H:i'));
            $this->assertTrue($runNow->isAvailableNow());
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_minimum_uses_eligible_subtotal_and_target_isolation_is_enforced(): void
    {
        $coupon = $this->coupon(['min_order_amount' => 101]);
        try {
            app(CouponService::class)->quoteCart($this->cart, $this->buyer, [$this->storeA->id => $coupon->code]);
            $this->fail('Expected minimum eligible subtotal validation.');
        } catch (CouponValidationException $exception) {
            $this->assertSame('minimum_eligible_amount_not_reached', $exception->reason);
        }
        try {
            app(CouponService::class)->syncTargets($coupon, ['scope' => 'products', 'product_ids' => [$this->productB->id]]);
            $this->fail('Expected seller target isolation validation.');
        } catch (CouponValidationException $exception) {
            $this->assertSame('invalid_target', $exception->reason);
        }
    }

    public function test_reservation_redemption_refund_and_free_shipping_are_store_order_scoped_and_idempotent(): void
    {
        $service = app(CouponService::class);
        $coupon = $this->coupon(['code' => 'SHIPFREE', 'discount_type' => 'free_shipping', 'discount_value' => 0]);
        $quote = $service->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'shipfree']);
        $order = Order::create(['user_id' => $this->buyer->id, 'order_no' => 'COUPON-'.Str::upper(Str::random(12)), 'payment_status' => 'pending']);
        $shipment = StoreOrder::create(['order_id' => $order->id, 'store_id' => $this->storeA->id, 'status' => 'pending', 'payment_status' => 'pending', 'financial_version' => 1, 'subtotal' => 100, 'delivery_fee' => 0, 'total' => 100]);
        $storeQuote = $quote['stores'][$this->storeA->id]['_quote'];

        $first = $service->reserve($shipment, $this->buyer, $storeQuote, 'checkout-key');
        $second = $service->reserve($shipment, $this->buyer, $storeQuote, 'checkout-key');
        $this->assertSame($first->id, $second->id);
        $this->assertDatabaseCount('coupon_usages', 1);
        $this->assertSame('reserved', $first->fresh()->status);
        $this->assertSame(1, $coupon->fresh()->reserved_count);
        $this->assertSame(12_50, $service->shippingDiscountForQuote($shipment, 12_50));

        $service->redeem($shipment);
        $this->assertSame('redeemed', $first->fresh()->status);
        $this->assertSame(1, $coupon->fresh()->usage_count);
        $this->assertSame(0, $coupon->fresh()->reserved_count);
        $service->markRefunded($shipment);
        $this->assertSame('refunded', $first->fresh()->status);
        $this->assertSame('12.50', $first->fresh()->shipping_discount);
    }

    public function test_order_creation_recalculates_and_snapshots_a_coupon_per_store_with_an_idempotency_key(): void
    {
        $this->coupon(['code' => 'ORDER20']);
        $address = UserAddress::create(['user_id' => $this->buyer->id, 'full_name' => 'Buyer', 'phone' => '123456789', 'address_line_1' => 'Test Street 1']);
        $first = app(OrderService::class)->placeOrder($this->buyer, $address->id, 'wallet', null, null, [$this->storeA->id => 'order20'], 'coupon-checkout-key');
        $second = app(OrderService::class)->placeOrder($this->buyer, $address->id, 'wallet', null, null, [$this->storeA->id => 'order20'], 'coupon-checkout-key');

        $this->assertSame($first['order']->id, $second['order']->id);
        $storeAOrder = collect($first['store_orders'])->firstWhere('store_id', $this->storeA->id);
        $storeBOrder = collect($first['store_orders'])->firstWhere('store_id', $this->storeB->id);
        $this->assertSame('20.00', $storeAOrder->coupon_discount);
        $this->assertSame('80.00', $storeAOrder->total);
        $this->assertSame('0.00', $storeBOrder->coupon_discount);
        $usage = CouponUsage::where('store_order_id', $storeAOrder->id)->firstOrFail();
        $this->assertSame('reserved', $usage->status);
        $this->assertSame($storeAOrder->items->first()->id, $usage->snapshot['affected_items'][0]['order_item_id']);
        $this->assertDatabaseCount('coupon_usages', 1);
    }

    public function test_paid_and_cancelled_store_order_transitions_redeem_then_preserve_coupon_history_as_refunded(): void
    {
        $this->coupon(['code' => 'PAY20']);
        $address = UserAddress::create(['user_id' => $this->buyer->id, 'full_name' => 'Buyer', 'phone' => '123456789', 'address_line_1' => 'Test Street 1']);
        $result = app(OrderService::class)->placeOrder($this->buyer, $address->id, 'wallet', null, null, [$this->storeA->id => 'pay20'], 'paid-coupon-key');
        $shipment = collect($result['store_orders'])->firstWhere('store_id', $this->storeA->id);
        $seller = $this->storeA->user;
        $quoted = app(OrderTotalsService::class)->quote($shipment, $seller, [
            'delivery_fee' => '10.00', 'delivery_method' => 'Courier', 'estimated_delivery_date' => now()->addDays(3)->toDateString(),
            'delivery_notes' => '', 'idempotency_key' => 'coupon-shipping-quote',
        ]);
        app(BuyerWalletService::class)->directTopUp($this->buyer, 200, 'coupon-payment-funds');
        $paid = app(PaymentService::class)->pay($quoted, $this->buyer, [
            'payment_method' => 'wallet', 'expected_total' => $quoted->total, 'idempotency_key' => 'coupon-payment',
        ]);
        $usage = CouponUsage::where('store_order_id', $paid->id)->firstOrFail();
        $this->assertSame('redeemed', $usage->status);
        app(RefundService::class)->cancel($paid, $this->buyer, 'Changed my mind');
        $this->assertSame('refunded', $usage->fresh()->status);
    }

    public function test_failed_wallet_payment_releases_the_reserved_coupon_slot(): void
    {
        $coupon = $this->coupon(['code' => 'FAIL20']);
        $address = UserAddress::create(['user_id' => $this->buyer->id, 'full_name' => 'Buyer', 'phone' => '123456789', 'address_line_1' => 'Test Street 1']);
        $result = app(OrderService::class)->placeOrder($this->buyer, $address->id, 'wallet', null, null, [$this->storeA->id => 'fail20'], 'failed-coupon-key');
        $shipment = collect($result['store_orders'])->firstWhere('store_id', $this->storeA->id);
        $quoted = app(OrderTotalsService::class)->quote($shipment, $this->storeA->user, [
            'delivery_fee' => '10.00', 'delivery_method' => 'Courier', 'estimated_delivery_date' => now()->addDays(3)->toDateString(),
            'delivery_notes' => '', 'idempotency_key' => 'failed-coupon-shipping-quote',
        ]);
        try {
            app(PaymentService::class)->pay($quoted, $this->buyer, ['payment_method' => 'wallet', 'expected_total' => $quoted->total, 'idempotency_key' => 'failed-coupon-payment']);
            $this->fail('Expected insufficient wallet balance.');
        } catch (\Throwable) {
            $this->assertSame('released', CouponUsage::where('store_order_id', $shipment->id)->value('status'));
            $this->assertSame(0, $coupon->fresh()->reserved_count);
        }
    }

    public function test_expired_reservation_cannot_be_paid_and_releases_its_usage_slot(): void
    {
        $coupon = $this->coupon(['code' => 'EXPIRE20']);
        $quote = app(CouponService::class)->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'expire20']);
        $order = Order::create(['user_id' => $this->buyer->id, 'order_no' => 'EXPIRE-'.Str::upper(Str::random(12)), 'payment_status' => 'pending']);
        $shipment = StoreOrder::create(['order_id' => $order->id, 'store_id' => $this->storeA->id, 'status' => 'pending', 'payment_status' => 'pending', 'financial_version' => 1, 'subtotal' => 100, 'delivery_fee' => 0, 'total' => 80]);
        $usage = app(CouponService::class)->reserve($shipment, $this->buyer, $quote['stores'][$this->storeA->id]['_quote'], 'expired-checkout-key');
        $usage->update(['expires_at' => now()->subMinute()]);
        app(CouponService::class)->expireReservation($shipment);
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$shipment->id.'/pay', [
            'payment_method' => 'wallet',
            'expected_total' => 80,
            'idempotency_key' => 'expired-coupon-payment',
        ])->assertUnprocessable()->assertJsonPath('errors.reason', 'coupon_reservation_expired');
        try {
            app(CouponService::class)->ensureReservationPayable($shipment);
            $this->fail('Expected expired reservation validation.');
        } catch (CouponValidationException $exception) {
            $this->assertSame('coupon_reservation_expired', $exception->reason);
            $this->assertSame('expired', $usage->fresh()->status);
            $this->assertSame(0, $coupon->fresh()->reserved_count);
        }
    }

    public function test_seller_coupon_management_is_store_isolated_and_admin_disable_does_not_change_history(): void
    {
        Sanctum::actingAs($this->storeA->user);
        $id = $this->postJson('/api/seller/coupons', [
            'code' => 'seller10', 'discount_type' => 'percentage', 'discount_value' => 10, 'scope' => 'products',
            'product_ids' => [$this->productA->id], 'is_public' => true,
        ])->assertCreated()->json('data.id');
        $this->assertSame('SELLER10', Coupon::findOrFail($id)->code);
        $this->assertDatabaseHas('coupon_products', ['coupon_id' => $id, 'product_id' => $this->productA->id]);
        $this->assertSame('10.00', app(CouponService::class)->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'seller10'])['coupon_discount']);
        $this->postJson('/api/seller/coupons/'.$id.'/toggle-status')->assertOk();
        $this->assertFalse(Coupon::findOrFail($id)->is_active);
        $this->assertSame('inactive', Coupon::findOrFail($id)->status);
        $this->postJson('/api/seller/coupons/'.$id.'/toggle-status')->assertOk();
        $this->assertTrue(Coupon::findOrFail($id)->is_active);
        $this->assertSame('active', Coupon::findOrFail($id)->status);
        $otherSeller = $this->storeB->user;
        Sanctum::actingAs($otherSeller);
        $this->getJson('/api/seller/coupons/'.$id)->assertNotFound();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->postJson('/api/admin/coupons/'.$id.'/disable')->assertOk();
        $this->assertNotNull(Coupon::findOrFail($id)->admin_disabled_at);
        try {
            app(CouponService::class)->quoteCart($this->cart, $this->buyer, [$this->storeA->id => 'seller10']);
            $this->fail('A globally disabled coupon must not quote.');
        } catch (CouponValidationException $exception) {
            $this->assertSame('inactive', $exception->reason);
        }
    }

    public function test_seller_coupon_index_loads_product_variants_without_a_sku_column(): void
    {
        ProductVariant::create([
            'product_id' => $this->productA->id,
            'color_name' => 'Tortoiseshell',
            'color_code' => '#583B24',
            'price' => 100,
            'stock_quantity' => 4,
            'stock_status' => 'in_stock',
        ]);

        Sanctum::actingAs($this->storeA->user);
        $this->getJson('/api/seller/coupons')
            ->assertOk()
            ->assertJsonPath('success', true);
    }
}
