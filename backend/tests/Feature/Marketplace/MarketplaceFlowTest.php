<?php

namespace Tests\Feature\Marketplace;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\PointRule;
use App\Models\PointTransaction;
use App\Models\Product;
use App\Models\SellerWallet;
use App\Models\SellerWalletEntry;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserAddress;
use App\Models\Wallet;
use App\Services\Marketplace\OrderTotalsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketplaceFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;

    private User $seller;

    private User $admin;

    private Store $store;

    private Product $product;

    private UserAddress $address;

    protected function beforeRefreshingDatabase(): void
    {
        if (! str_starts_with(config('database.connections.mysql.database'), 'opty_marketplace_test')) {
            throw new \RuntimeException('Disposable marketplace database required.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        Http::preventStrayRequests();
        config(['marketplace.development_top_up' => true, 'services.stripe.secret' => null]);
        $this->buyer = User::factory()->create(['role' => 'buyer']);
        $this->seller = User::factory()->create(['role' => 'seller']);
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->store = Store::create(['user_id' => $this->seller->id, 'name' => 'Optics', 'slug' => (string) Str::uuid(), 'status' => 'active', 'is_active' => true]);
        $this->product = $this->product($this->store);
        $this->address = UserAddress::create(['user_id' => $this->buyer->id, 'full_name' => 'Buyer Recipient', 'phone' => '+49123456789',
            'address_line_1' => '10 Original Street', 'address_line_2' => 'Apartment 7', 'postal_code' => '10115']);
        Wallet::create(['user_id' => $this->buyer->id, 'shopping_balance' => '500.00']);
    }

    private function product(Store $store): Product
    {
        return Product::create(['store_id' => $store->id, 'name' => 'Glasses', 'slug' => (string) Str::uuid(), 'sku' => (string) Str::uuid(),
            'price' => 40, 'stock_quantity' => 20, 'stock_status' => 'in_stock', 'is_approved' => true, 'is_active' => true,
            'product_type' => 'accessory', 'shipping_type' => 'fixed', 'shipping_fee' => 99]);
    }

    private function cart(Product $product): void
    {
        $cart = Cart::firstOrCreate(['user_id' => $this->buyer->id]);
        CartItem::create(['cart_id' => $cart->id, 'store_id' => $product->store_id, 'product_id' => $product->id, 'quantity' => 2, 'price' => 40]);
    }

    private function place(bool $fill = true): StoreOrder
    {
        if ($fill) {
            $this->cart($this->product);
        }
        Sanctum::actingAs($this->buyer);
        $id = $this->postJson('/api/buyer/checkout/place', ['delivery_address_id' => $this->address->id, 'payment_method' => 'wallet'])
            ->assertOk()->json('data.store_orders.0.id');

        return StoreOrder::findOrFail($id);
    }

    private function quoteData(string $fee = '7.50'): array
    {
        return ['delivery_fee' => $fee, 'delivery_method' => 'Tracked courier', 'estimated_delivery_date' => now()->addDays(2)->toDateString(),
            'delivery_notes' => 'Call on arrival', 'idempotency_key' => 'quote-1'];
    }

    private function quote(StoreOrder $so): void
    {
        Sanctum::actingAs($so->store->user);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/accept', $this->quoteData())->assertOk()->assertJsonPath('data.status', 'awaiting_payment');
    }

    private function pay(StoreOrder $so)
    {
        Sanctum::actingAs($this->buyer);

        return $this->postJson('/api/buyer/store-orders/'.$so->id.'/pay', ['payment_method' => 'wallet', 'expected_total' => $so->fresh()->total, 'idempotency_key' => 'pay-'.$so->id]);
    }

    private function paid(): StoreOrder
    {
        $so = $this->place();
        $this->quote($so);
        $this->pay($so)->assertOk();

        return $so->fresh();
    }

    private function deliver(StoreOrder $so): void
    {
        Sanctum::actingAs($this->buyer);
        $code = $this->getJson('/api/buyer/store-orders/'.$so->id)->assertOk()->json('data.delivery_code');
        Sanctum::actingAs($so->store->user);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/out-for-delivery')->assertOk();
        $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => $code])->assertOk();
    }

    public function test_address_ownership_and_checkout_ignore_product_shipping(): void
    {
        $this->cart($this->product);
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/checkout/preview')->assertOk()->assertJsonPath('data.shipping_total', 0);
        $foreign = UserAddress::create(['user_id' => $this->seller->id, 'full_name' => 'Other', 'address_line_1' => 'Private']);
        $this->postJson('/api/buyer/checkout/place', ['delivery_address_id' => $foreign->id])->assertUnprocessable();
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_snapshot_survives_address_edit_and_delete_and_codes_are_hidden(): void
    {
        $so = $this->place();
        $this->assertSame('pending', $so->status);
        $this->assertSame('0.00', $so->delivery_fee);
        $this->assertNull($so->delivery_code_hash);
        $this->address->update(['address_line_1' => 'Changed']);
        $this->address->delete();
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/orders/'.$so->id)->assertOk()->assertJsonPath('data.delivery_address_snapshot.address_line_1', '10 Original Street')
            ->assertJsonMissingPath('data.delivery_code')->assertJsonMissingPath('data.delivery_code_hash');
        Sanctum::actingAs($this->buyer);
        $this->getJson('/api/buyer/orders/'.$so->order_id)->assertOk()->assertJsonPath('data.store_orders.0.delivery_code', null)
            ->assertJsonPath('data.delivery_address_snapshot.phone', '+49123456789');
    }

    public function test_snapshot_cannot_be_overwritten(): void
    {
        $so = $this->place();
        $this->expectException(\LogicException::class);
        $so->update(['delivery_address_snapshot' => ['address_line_1' => 'Tamper']]);
    }

    public function test_quote_synchronizes_totals_and_duplicates_do_not_mutate_them(): void
    {
        $so = $this->place();
        $this->quote($so);
        $this->quote($so);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/accept', $this->quoteData('9.00'))->assertConflict();
        Sanctum::actingAs($this->buyer);
        $this->getJson('/api/buyer/orders/'.$so->order_id)->assertOk()->assertJsonPath('data.shipping_total', '7.50')->assertJsonPath('data.grand_total', '87.50');
        $this->getJson('/api/buyer/orders/'.$so->order_id.'/payment-info')->assertOk()->assertJsonPath('data.total_due', 87.5);
    }

    public function test_payment_requires_current_total_and_locks_escrow_once(): void
    {
        $so = $this->place();
        $this->quote($so);
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/pay', ['payment_method' => 'wallet', 'expected_total' => 80, 'idempotency_key' => 'stale'])->assertConflict();
        $this->pay($so)->assertOk();
        $this->pay($so)->assertOk();
        $this->assertSame('412.50', $this->buyer->wallet()->first()->shopping_balance);
        $this->assertDatabaseCount('marketplace_payments', 1);
        $this->assertDatabaseCount('escrows', 1);
        $this->assertSame('87.50', SellerWallet::first()->pending_balance);
        $this->assertSame('0.00', SellerWallet::first()->available_balance);
        $this->assertSame('paid', $so->order->fresh()->payment_status);
    }

    public function test_insufficient_funds_roll_back_every_record(): void
    {
        $so = $this->place();
        $this->quote($so);
        $this->buyer->wallet()->update(['shopping_balance' => 0]);
        $this->pay($so)->assertUnprocessable();
        $this->assertDatabaseCount('escrows', 0);
        $this->assertDatabaseCount('marketplace_payments', 0);
        $this->assertDatabaseCount('seller_wallet_entries', 0);
    }

    public function test_card_cannot_create_a_payment_without_provider(): void
    {
        $so = $this->place();
        $this->quote($so);
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/pay', ['payment_method' => 'card', 'expected_total' => 87.5, 'idempotency_key' => 'card'])->assertStatus(503);
        $this->assertDatabaseCount('escrows', 0);
    }

    public function test_unpaid_order_cannot_ship_or_verify(): void
    {
        $so = $this->place();
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/out-for-delivery')->assertConflict();
        $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => '123456'])->assertConflict();
    }

    public function test_secure_code_is_only_visible_to_paid_buyer_and_delivery_releases_once(): void
    {
        $so = $this->paid();
        $this->assertNull($so->delivery_code);
        $this->assertNotEmpty($so->delivery_code_hash);
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/orders/'.$so->id)->assertOk()->assertJsonMissingPath('data.delivery_code_encrypted');
        $this->deliver($so);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => '123456'])->assertOk();
        $this->assertSame('released', $so->escrow()->first()->status);
        $this->assertSame('0.00', SellerWallet::first()->pending_balance);
        $this->assertSame('87.50', SellerWallet::first()->available_balance);
        $this->assertSame(1, SellerWalletEntry::where('type', 'escrow_release')->count());
        $this->assertNull(Wallet::where('user_id', $this->seller->id)->first());
    }

    public function test_invalid_attempts_persist_and_lock_and_expiry_requires_new_code(): void
    {
        $so = $this->paid();
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/out-for-delivery')->assertOk();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => 'xxxxxx'])->assertUnprocessable();
        }
        // Valid format but wrong secret exercises the persisted attempt counter.
        $so->update(['delivery_code_hash' => \Illuminate\Support\Facades\Hash::make('999999')]);
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => '000000'])->assertUnprocessable();
        }
        $this->assertEquals(5, $so->fresh()->delivery_code_attempts);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => '999999'])->assertStatus(429);
        $this->travel(8)->days();
        $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => '999999'])->assertUnprocessable();
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/delivery-code')->assertOk();
        $this->assertTrue($so->fresh()->delivery_code_expires_at->isFuture());
    }

    public function test_development_top_up_is_idempotent_and_recorded(): void
    {
        Sanctum::actingAs($this->buyer);
        $data = ['amount' => '25.50', 'idempotency_key' => 'development-one'];
        $this->postJson('/api/buyer/wallet/development-top-up', $data)->assertOk()->assertJsonPath('data.transaction.meta.payment_method', 'development');
        $this->postJson('/api/buyer/wallet/development-top-up', $data)->assertOk();
        $this->postJson('/api/buyer/wallet/development-top-up', array_replace($data, ['amount' => 30]))->assertConflict();
        $this->assertSame('525.50', $this->buyer->wallet()->first()->shopping_balance);
        $this->assertDatabaseCount('transactions', 1);
    }

    public function test_development_funding_never_works_in_production_or_when_disabled(): void
    {
        Sanctum::actingAs($this->buyer);
        $data = ['amount' => 10, 'idempotency_key' => 'dev'];
        config(['marketplace.development_top_up' => false]);
        $this->postJson('/api/buyer/wallet/development-top-up', $data)->assertForbidden();
        config(['marketplace.development_top_up' => true]);
        $this->app->instance('env', 'production');
        $this->postJson('/api/buyer/wallet/development-top-up', $data)->assertForbidden();
        $this->getJson('/api/buyer/wallet/capabilities')->assertOk()->assertJsonPath('data.development_top_up', false);
    }

    public function test_stripe_requires_provider_verification_and_configured_origin(): void
    {
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/wallet/top-up', ['stripe_session_id' => 'cs_fake'])->assertStatus(503);
        config(['services.stripe.secret' => 'sk_test_fake', 'marketplace.development_return_origins' => ['http://localhost:3999']]);
        Http::fake(['api.stripe.com/v1/checkout/sessions' => Http::response(['id' => 'cs_test_one', 'url' => 'https://checkout.stripe.com/test']),
            'api.stripe.com/v1/checkout/sessions/*' => Http::response(['id' => 'cs_test_one', 'payment_status' => 'unpaid'])]);
        $data = ['amount' => 1000, 'currency' => 'eur', 'success_url' => 'http://localhost:3999/profile/top-up?session_id={CHECKOUT_SESSION_ID}', 'cancel_url' => 'http://localhost:3999/profile/top-up'];
        $this->postJson('/api/buyer/wallet/create-checkout-session', $data)->assertOk();
        $this->postJson('/api/buyer/wallet/top-up', ['stripe_session_id' => 'cs_test_one'])->assertUnprocessable();
        $this->app->instance('env', 'production');
        $this->postJson('/api/buyer/wallet/create-checkout-session', $data)->assertUnprocessable();
        $this->assertSame('500.00', $this->buyer->wallet()->first()->shopping_balance);
    }

    public function test_paid_cancellation_refunds_buyer_reverses_escrow_and_restores_inventory_once(): void
    {
        $so = $this->paid();
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/cancel')->assertOk();
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/cancel')->assertOk();
        $this->assertSame('500.00', $this->buyer->wallet()->first()->shopping_balance);
        $this->assertSame('refunded', $so->fresh()->payment_status);
        $this->assertEquals(20, $this->product->fresh()->stock_quantity);
        $this->assertSame('0.00', SellerWallet::first()->pending_balance);
        $this->assertEquals(1, Transaction::where('type', 'refund')->count());
        $this->assertSame('refunded', $so->order->fresh()->payment_status);
    }

    public function test_dispute_holds_released_earnings_and_admin_refund_reverses_them(): void
    {
        $so = $this->paid();
        $this->deliver($so);
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/dispute', ['reason' => 'Wrong item delivered'])->assertOk();
        $this->assertSame('0.00', SellerWallet::first()->available_balance);
        $this->assertSame('87.50', SellerWallet::first()->disputed_balance);
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/admin/store-orders/'.$so->id.'/status', ['status' => 'refunded', 'reason' => 'Refund approved after review'])->assertOk();
        $this->assertSame('0.00', SellerWallet::first()->disputed_balance);
        $this->assertSame('0.00', SellerWallet::first()->total_earnings);
        $this->assertSame('500.00', $this->buyer->wallet()->first()->shopping_balance);
    }

    public function test_withdrawal_reserves_funds_and_admin_lifecycle_is_idempotent(): void
    {
        $so = $this->paid();
        $this->deliver($so);
        Sanctum::actingAs($this->seller);
        $data = ['amount' => '50.00', 'idempotency_key' => 'withdraw-one', 'bank_details' => ['account_name' => 'Seller', 'account_number' => 'DE123456', 'bank_name' => 'Test Bank']];
        $id = $this->postJson('/api/seller/wallet/withdrawals', $data)->assertCreated()->json('data.id');
        $this->postJson('/api/seller/wallet/withdrawals', $data)->assertCreated()->assertJsonPath('data.id', $id);
        $this->assertSame('37.50', SellerWallet::first()->available_balance);
        $this->assertSame('50.00', SellerWallet::first()->reserved_balance);
        Sanctum::actingAs($this->admin);
        foreach (['approved', 'processing', 'completed'] as $status) {
            $body = ['status' => $status, 'notes' => 'Reviewed bank transfer', 'payout_reference' => 'bank-transfer-001'];
            $this->postJson('/api/admin/finance/withdrawals/'.$id, $body)->assertOk();
            $this->postJson('/api/admin/finance/withdrawals/'.$id, $body)->assertOk();
        }
        $this->assertSame('0.00', SellerWallet::first()->reserved_balance);
        $this->assertEquals(1, SellerWalletEntry::where('type', 'withdrawal_completed')->count());
        $this->putJson('/api/admin/store-orders/'.$so->id.'/status', ['status' => 'refunded', 'reason' => 'Returned after payout'])->assertOk();
        $this->assertSame('50.00', SellerWallet::first()->debt_balance);
        $this->assertSame('0.00', SellerWallet::first()->available_balance);
    }

    public function test_admin_authorization_and_buyer_seller_isolation(): void
    {
        $so = $this->place();
        foreach ([$this->buyer, $this->seller] as $user) {
            Sanctum::actingAs($user);
            foreach (['/api/admin/orders', '/api/admin/finance/seller-wallets', '/api/admin/dashboard', '/api/admin/ad-campaigns', '/api/admin/discount-campaigns'] as $url) {
                $this->getJson($url)->assertForbidden();
            }
        }
        $other = User::factory()->create(['role' => 'buyer']);
        Sanctum::actingAs($other);
        $this->getJson('/api/buyer/orders/'.$so->order_id)->assertNotFound();
        $this->payForeign($so);
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/buyer/wallet/balance')->assertForbidden();
        Sanctum::actingAs($this->buyer);
        $this->getJson('/api/seller/wallet')->assertForbidden();
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/admin/orders/'.$so->order_id.'/status', ['payment_status' => 'paid'])->assertUnprocessable();
        $this->putJson('/api/admin/store-orders/'.$so->id.'/status', ['status' => 'delivered', 'reason' => 'Cannot bypass code'])->assertUnprocessable();
    }

    private function payForeign(StoreOrder $so): void
    {
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/pay', ['payment_method' => 'wallet', 'expected_total' => 80, 'idempotency_key' => 'foreign'])->assertNotFound();
    }

    public function test_multi_store_orders_keep_payment_status_correct_after_first_delivery(): void
    {
        $other = User::factory()->create(['role' => 'seller']);
        $store = Store::create(['user_id' => $other->id, 'name' => 'Second', 'slug' => (string) Str::uuid(), 'status' => 'active']);
        $this->cart($this->product);
        $this->cart($this->product($store));
        $first = $this->place(false);
        $second = StoreOrder::where('order_id', $first->order_id)->whereKeyNot($first->id)->firstOrFail();
        $this->quote($first);
        $this->quote($second);
        $this->assertSame('175.00', $first->order->fresh()->grand_total);
        $this->pay($first)->assertOk();
        $this->deliver($first);
        $this->assertSame('partially_paid', $first->order->fresh()->payment_status);
        $this->pay($second)->assertOk();
        $this->assertSame('paid', $first->order->fresh()->payment_status);
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/orders/'.$second->id)->assertNotFound();
        $this->assertSame('325.00', $this->buyer->wallet()->first()->shopping_balance);
    }

    public function test_unpaid_cancellation_restock_is_idempotent(): void
    {
        $so = $this->place();
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/cancel')->assertOk();
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/cancel')->assertOk();
        $this->assertEquals(20, $this->product->fresh()->stock_quantity);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertSame('0.00', $so->order->fresh()->grand_total);
    }

    public function test_withdrawal_rejection_releases_reserve_once(): void
    {
        $so = $this->paid();
        $this->deliver($so);
        Sanctum::actingAs($this->seller);
        $id = $this->postJson('/api/seller/wallet/withdrawals', ['amount' => 50, 'idempotency_key' => 'reject-request',
            'bank_details' => ['account_name' => 'Seller', 'account_number' => 'DE123', 'bank_name' => 'Bank']])->assertCreated()->json('data.id');
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/admin/finance/withdrawals/'.$id, ['status' => 'completed', 'notes' => 'Invalid transition', 'payout_reference' => 'x'])->assertConflict();
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/admin/finance/withdrawals/'.$id, ['status' => 'rejected', 'notes' => 'Incorrect bank details'])->assertOk();
        }
        $this->assertSame('87.50', SellerWallet::first()->available_balance);
        $this->assertSame('0.00', SellerWallet::first()->reserved_balance);
    }

    public function test_dispute_resolution_restores_available_balance_once(): void
    {
        $so = $this->paid();
        $this->deliver($so);
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/dispute', ['reason' => 'Please investigate'])->assertOk();
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/wallet/withdrawals', ['amount' => 10, 'idempotency_key' => 'held',
            'bank_details' => ['account_name' => 'Seller', 'account_number' => 'DE123', 'bank_name' => 'Bank']])->assertUnprocessable();
        Sanctum::actingAs($this->admin);
        for ($i = 0; $i < 2; $i++) {
            $this->putJson('/api/admin/store-orders/'.$so->id.'/status', ['status' => 'resolve_dispute', 'reason' => 'Delivered correctly'])->assertOk();
        }
        $this->assertSame('87.50', SellerWallet::first()->available_balance);
        $this->assertSame('0.00', SellerWallet::first()->disputed_balance);
    }

    public function test_points_are_awarded_once_and_reversed_on_refund(): void
    {
        PointRule::create(['name' => 'Purchase', 'type' => 'purchase', 'points_per_euro' => 1, 'is_active' => true]);
        $so = $this->paid();
        $this->deliver($so);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/delivered', ['delivery_code' => '000000'])->assertOk();
        $this->assertSame('80.00', $this->buyer->wallet()->first()->loyality_points);
        $this->assertEquals(1, PointTransaction::where('type', 'earn')->count());
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/admin/store-orders/'.$so->id.'/status', ['status' => 'refunded', 'reason' => 'Approved return'])->assertOk();
        $this->assertSame('0.00', $this->buyer->wallet()->first()->loyality_points);
    }

    public function test_discount_allocation_preserves_cents_across_stores(): void
    {
        $first = $this->place();
        $second = StoreOrder::create(['order_id' => $first->order_id, 'store_id' => $this->store->id, 'subtotal' => '40.00', 'total' => '40.00']);
        DB::transaction(fn () => app(OrderTotalsService::class)->allocate($first->order, '10.01', '100.00'));
        $this->assertSame('6.67', $first->fresh()->discount_total);
        $this->assertSame('3.34', $second->fresh()->discount_total);
        $this->assertEquals(100, (float) $first->fresh()->redeemed_points + (float) $second->fresh()->redeemed_points);
        app(OrderTotalsService::class)->sync($first->order);
        $this->assertSame('109.99', $first->order->fresh()->grand_total);
    }

    public function test_stripe_confirm_credits_only_owner_paid_amount_once(): void
    {
        Sanctum::actingAs($this->buyer);
        config(['services.stripe.secret' => 'sk_test_fake']);
        $session = ['id' => 'cs_verified', 'payment_status' => 'paid', 'status' => 'complete', 'mode' => 'payment', 'currency' => 'eur', 'amount_total' => 1250,
            'metadata' => ['type' => 'wallet_topup', 'user_id' => (string) $this->buyer->id]];
        Http::fake(['api.stripe.com/v1/checkout/sessions/*' => Http::response($session)]);
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/buyer/wallet/top-up', ['stripe_session_id' => 'cs_verified'])->assertOk();
        }
        $this->assertSame('512.50', $this->buyer->wallet()->first()->shopping_balance);
        $this->assertDatabaseCount('transactions', 1);
        Sanctum::actingAs(User::factory()->create(['role' => 'buyer']));
        $this->postJson('/api/buyer/wallet/top-up', ['stripe_session_id' => 'cs_verified'])->assertUnprocessable();
    }

    public function test_legacy_orders_cannot_be_quoted_or_paid_without_reconciliation(): void
    {
        $so = $this->place();
        $so->update(['financial_version' => 0]);
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/store-orders/'.$so->id.'/accept', $this->quoteData())->assertConflict();
        $so->update(['status' => 'awaiting_payment']);
        $this->pay($so)->assertConflict();
        $this->postJson('/api/buyer/store-orders/'.$so->id.'/cancel')->assertConflict();
        $this->assertDatabaseCount('marketplace_payments', 0);
    }

    public function test_read_only_reconciliation_detects_balance_and_payment_corruption(): void
    {
        $so = $this->paid();
        $audit = app(\App\Services\Marketplace\ReconciliationService::class);
        $this->assertTrue($audit->audit()['ok']);
        $this->deliver($so);
        $this->assertTrue($audit->audit()['ok']);
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/admin/store-orders/'.$so->id.'/status', ['status' => 'refunded', 'reason' => 'Verified returned items'])->assertOk();
        $this->assertTrue($audit->audit()['ok']);
        $wallet = SellerWallet::where('store_id', $this->store->id)->firstOrFail();
        $wallet->update(['available_balance' => '1.00']);
        $so->payment->transaction->update(['amount' => '-1.00']);
        $result = $audit->audit();
        $this->assertFalse($result['ok']);
        $this->assertContains('Shipment '.$so->id.': buyer debit mismatch', $result['issues']);
        $this->assertContains('Seller wallet '.$wallet->id.': available_balance differs from ledger', $result['issues']);
        $this->assertSame('1.00', $wallet->fresh()->available_balance); // Audit never repairs money.
    }

    // Last test commits fixtures so independent PHP connections can contend for the same rows.
    public function test_real_concurrent_retries_do_not_duplicate_financial_entries(): void
    {
        $so = $this->place();
        DB::commit();
        $race = function (string $action, User $user, array $extra = []) use ($so) {
            $input = ['action' => $action, 'user' => $user->id, 'order' => $so->id, 'start' => microtime(true) + 2] + $extra;
            $env = ['APP_ENV' => 'testing', 'APP_KEY' => 'base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', 'DB_CONNECTION' => 'mysql',
                'DB_HOST' => '127.0.0.1', 'DB_PORT' => '3318', 'DB_DATABASE' => 'opty_marketplace_test', 'DB_USERNAME' => 'root', 'DB_PASSWORD' => '',
                'MARKETPLACE_DEVELOPMENT_TOP_UP' => 'true', 'QUEUE_CONNECTION' => 'sync', 'MAIL_MAILER' => 'array', 'CACHE_STORE' => 'array', 'BCRYPT_ROUNDS' => '4'];
            $workers = [];
            for ($i = 0; $i < 3; $i++) {
                $p = new \Symfony\Component\Process\Process([PHP_BINARY, base_path('tests/Support/marketplace-race-worker.php'), json_encode($input)], base_path(), $env);
                $p->setTimeout(30);
                $p->start();
                $workers[] = $p;
            }
            foreach ($workers as $p) {
                $p->wait();
                $this->assertTrue($p->isSuccessful(), $p->getOutput().$p->getErrorOutput());
            }
        };
        $race('topup', $this->buyer);
        $race('quote', $this->seller);
        $race('pay', $this->buyer);
        $this->assertSame('432.50', $this->buyer->wallet()->first()->shopping_balance);
        $this->assertDatabaseCount('marketplace_payments', 1);
        $this->assertDatabaseCount('escrows', 1);
        app(\App\Services\Marketplace\DeliveryVerificationService::class)->advance($so, $this->seller, 'out_for_delivery');
        $code = app(\App\Services\Marketplace\DeliveryVerificationService::class)->buyerCode($so->fresh());
        $race('verify', $this->seller, ['code' => $code]);
        $race('withdraw', $this->seller);
        $this->assertSame('37.50', SellerWallet::first()->available_balance);
        $this->assertSame('50.00', SellerWallet::first()->reserved_balance);
        $this->assertDatabaseCount('seller_withdrawals', 1);
        $this->assertEquals(1, SellerWalletEntry::where('type', 'escrow_release')->count());
        $race('refund', $this->admin);
        $this->assertSame('520.00', $this->buyer->wallet()->first()->shopping_balance);
        $this->assertEquals(1, Transaction::where('type', 'refund')->count());
    }
}
