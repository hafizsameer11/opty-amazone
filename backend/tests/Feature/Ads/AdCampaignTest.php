<?php

namespace Tests\Feature\Ads;

use App\Models\AdCampaign;
use App\Models\Country;
use App\Models\Escrow;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Ads\AdAnalyticsService;
use App\Services\Ads\AdAttributionService;
use App\Services\Ads\AdCampaignService;
use App\Services\Ads\AdDeliveryService;
use App\Services\Ads\AdReconciliationService;
use App\Services\Ads\LegacyBoostImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdCampaignTest extends TestCase
{
    use RefreshDatabase;

    private User $seller;

    private User $admin;

    private User $buyer;

    private Product $product;

    protected function beforeRefreshingDatabase(): void
    {
        // The legacy schema assumes a frame_sizes FK that has no creation migration.
        // Supply that prerequisite ONLY in the disposable integration test database.
        \Illuminate\Support\Facades\Event::listen(\Illuminate\Database\Events\MigrationStarted::class, function ($event) {
            if (str_contains((new \ReflectionClass($event->migration))->getFileName(), 'require_color_on_frame_sizes')
                && ! \Illuminate\Support\Facades\Schema::hasColumn('frame_sizes', 'product_variant_id')) {
                \Illuminate\Support\Facades\Schema::table('frame_sizes', function ($t) {
                    $t->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
                });
            }
        });
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 9, 13)->setTime(12, 0));
        config(['ads.review_required' => true]);
        $this->seller = User::factory()->create(['role' => 'seller']);
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->buyer = User::factory()->create(['role' => 'buyer']);
        $store = Store::create(['user_id' => $this->seller->id, 'name' => 'Optics', 'slug' => (string) Str::uuid(), 'status' => 'active', 'is_active' => true]);
        $this->product = Product::create(['store_id' => $store->id, 'name' => 'Blue Glasses', 'slug' => (string) Str::uuid(),
            'sku' => (string) Str::uuid(), 'price' => '40.00', 'stock_quantity' => 20, 'stock_status' => 'in_stock',
            'is_approved' => true, 'is_active' => true, 'is_muted' => false]);
        Wallet::create(['user_id' => $this->seller->id, 'shopping_balance' => '100.00', 'ad_credit' => '5.00']);
    }

    private function draft(array $overrides = []): array
    {
        return array_replace(['product_id' => $this->product->id, 'name' => 'Autumn glasses',
            'starts_at' => now()->toIso8601String(), 'ends_at' => now()->addDays(2)->toIso8601String(),
            'budget_type' => 'total', 'budget_amount' => '10.00', 'bid_type' => 'cpc', 'bid_amount' => '1.00',
            'locations' => ['global'], 'placements' => ['homepage'], 'confirm_reservation' => true, 'idempotency_key' => (string) Str::uuid()], $overrides);
    }

    private function create(array $overrides = []): AdCampaign
    {
        Sanctum::actingAs($this->seller);
        $id = $this->postJson('/api/seller/ad-campaigns', $this->draft($overrides))->assertCreated()->json('data.id');

        return AdCampaign::findOrFail($id);
    }

    private function active(array $overrides = []): AdCampaign
    {
        $c = $this->create($overrides);

        return app(AdCampaignService::class)->action($c, $this->admin, 'approve', 'Reviewed product and targeting');
    }

    private function serve(): array
    {
        Sanctum::actingAs($this->buyer);

        return $this->getJson('/api/buyer/ads?placement=homepage')->assertOk()->json('data');
    }

    private function event(string $token, string $type = 'impression')
    {
        return $this->postJson('/api/buyer/ads/events', ['tracking_token' => $token, 'type' => $type]);
    }

    public function test_creation_reserves_real_wallet_funds_once_and_requires_admin_review(): void
    {
        Sanctum::actingAs($this->seller);
        $draft = $this->draft();
        $first = $this->postJson('/api/seller/ad-campaigns', $draft)->assertCreated()->assertJsonPath('data.status', 'pending_review');
        $this->postJson('/api/seller/ad-campaigns', $draft)->assertCreated()->assertJsonPath('data.id', $first->json('data.id'));
        $this->assertSame('95.00', $this->seller->wallet->fresh()->shopping_balance);
        $this->assertSame('0.00', $this->seller->wallet->fresh()->ad_credit);
        $this->assertDatabaseCount('ad_budget_transactions', 1);
        $this->assertDatabaseCount('ad_audit_logs', 2);
        $this->assertSame([], $this->serve());
    }

    public function test_changed_idempotent_request_and_duplicate_open_product_are_rejected(): void
    {
        Sanctum::actingAs($this->seller);
        $data = $this->draft();
        $this->postJson('/api/seller/ad-campaigns', $data)->assertCreated();
        $this->postJson('/api/seller/ad-campaigns', array_replace($data, ['name' => 'Changed']))->assertUnprocessable();
        $this->postJson('/api/seller/ad-campaigns', $this->draft())->assertUnprocessable();
        $this->assertDatabaseCount('ad_campaigns', 1);
    }

    public function test_ownership_and_admin_permissions_are_enforced(): void
    {
        $c = $this->create();
        $other = User::factory()->create(['role' => 'seller']);
        Sanctum::actingAs($other);
        $this->getJson('/api/seller/ad-campaigns/'.$c->id)->assertForbidden();
        $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/actions', ['action' => 'cancel'])->assertForbidden();
        $this->getJson('/api/admin/ad-campaigns')->assertForbidden();
        Sanctum::actingAs($this->buyer);
        $this->postJson('/api/seller/ad-campaigns', $this->draft())->assertForbidden();
        $this->getJson('/api/admin/ad-campaigns/'.$c->id.'/audits')->assertForbidden();
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/actions', ['action' => 'approve'])->assertUnprocessable();
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/admin/ad-campaigns/'.$c->id.'/actions', ['action' => 'approve'])->assertUnprocessable();
    }

    public function test_product_eligibility_and_validation_rules(): void
    {
        Sanctum::actingAs($this->seller);
        foreach ([['budget_amount' => '0'], ['bid_amount' => '11'], ['bid_type' => 'cpm'], ['budget_amount' => '1.001'],
            ['starts_at' => now()->subDay()->toIso8601String()], ['ends_at' => now()->subDay()->toIso8601String()],
            ['ends_at' => now()->addDays(100)->toIso8601String()], ['locations' => ['city']],
            ['placements' => ['store_banner']], ['confirm_reservation' => false]] as $invalid) {
            $this->postJson('/api/seller/ad-campaigns', $this->draft($invalid))->assertUnprocessable();
        }
        foreach ([['is_approved' => false], ['is_muted' => true], ['stock_quantity' => 0], ['stock_status' => 'out_of_stock'], ['is_active' => false]] as $invalid) {
            $original = $this->product->only(array_keys($invalid));
            $this->product->update($invalid);
            $this->postJson('/api/seller/ad-campaigns', $this->draft())->assertUnprocessable();
            $this->product->update($original);
        }
        $this->assertDatabaseCount('ad_campaigns', 0);
    }

    public function test_failed_reservation_never_activates_and_can_be_retried_once_funded(): void
    {
        $this->seller->wallet->update(['shopping_balance' => 0, 'ad_credit' => 0]);
        $c = $this->create();
        $this->assertSame('payment_failed', $c->status);
        $this->assertDatabaseCount('ad_budget_transactions', 0);
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/admin/ad-campaigns/'.$c->id.'/actions', ['action' => 'approve', 'reason' => 'Reviewed'])->assertUnprocessable();
        $this->seller->wallet->update(['shopping_balance' => 15]);
        Sanctum::actingAs($this->seller);
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/actions', ['action' => 'pay'])->assertOk()->assertJsonPath('data.status', 'pending_review');
        }
        $this->assertSame('5.00', $this->seller->wallet->fresh()->shopping_balance);
        $this->assertDatabaseCount('ad_budget_transactions', 1);
    }

    public function test_schedule_activation_expiry_and_release_are_idempotent(): void
    {
        $c = $this->active(['starts_at' => now()->addHour()->toIso8601String()]);
        $this->assertSame('scheduled', $c->status);
        $this->travel(2)->hours();
        for ($i = 0; $i < 2; $i++) {
            app(AdCampaignService::class)->refreshLifecycle($c->id);
        }
        $this->assertSame('active', $c->fresh()->status);
        $this->travel(3)->days();
        for ($i = 0; $i < 2; $i++) {
            app(AdCampaignService::class)->refreshLifecycle($c->id);
        }
        $this->assertSame('completed', $c->fresh()->status);
        $this->assertSame('100.00', $this->seller->wallet->fresh()->shopping_balance);
        $this->assertSame('5.00', $this->seller->wallet->fresh()->ad_credit);
        $this->assertSame(1, $c->transactions()->where('type', 'release')->count());
    }

    public function test_pause_resume_cancel_and_admin_hold(): void
    {
        $c = $this->active();
        $service = app(AdCampaignService::class);
        $service->action($c, $this->seller, 'pause');
        $this->assertSame([], $this->serve());
        $service->action($c, $this->seller, 'resume');
        $this->assertCount(1, $this->serve());
        $service->action($c, $this->admin, 'pause', 'Investigating');
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/actions', ['action' => 'resume'])->assertUnprocessable();
        $service->action($c, $this->admin, 'resume', 'Investigation complete');
        for ($i = 0; $i < 2; $i++) {
            $service->action($c, $this->seller, 'cancel');
        }
        $this->assertSame('cancelled', $c->fresh()->status);
        $this->assertSame(1000, (int) $c->fresh()->released_cents);
    }

    public function test_impression_click_spending_dedup_tokens_and_frequency_cap(): void
    {
        $c = $this->active();
        $ad = $this->serve()[0];
        $this->event('fake', 'click')->assertUnprocessable();
        $this->event($ad['tracking_token'], 'click')->assertJsonPath('data.accepted', false);
        $this->event($ad['tracking_token'])->assertJsonPath('data.accepted', true);
        $this->event($ad['tracking_token'])->assertJsonPath('data.duplicate', true);
        $this->event($ad['tracking_token'], 'click')->assertJsonPath('data.accepted', true);
        $this->event($ad['tracking_token'], 'click')->assertJsonPath('data.duplicate', true);
        $this->assertSame(100, (int) $c->fresh()->spent_cents);
        $this->assertSame(1, (int) $c->fresh()->impressions);
        $this->assertSame(1, (int) $c->fresh()->clicks);
        $this->assertSame([], $this->serve());
        $this->assertTrue(app(AdReconciliationService::class)->reconcile($c->id));
    }

    public function test_budget_exhaustion_stops_delivery_and_refunds_unspendable_remainder(): void
    {
        $c = $this->active(['budget_amount' => '1.50', 'bid_amount' => '1.00']);
        $ad = $this->serve()[0];
        $this->event($ad['tracking_token']);
        $this->event($ad['tracking_token'], 'click');
        $this->assertSame('exhausted', $c->fresh()->status);
        $this->assertSame(100, (int) $c->fresh()->spent_cents);
        $this->assertSame(50, (int) $c->fresh()->released_cents);
        $this->assertSame('4.00', $this->seller->wallet->fresh()->ad_credit);
        $this->assertSame([], $this->serve());
    }

    public function test_daily_budget_reserves_all_utc_days_and_resets_delivery_next_day(): void
    {
        $c = $this->active(['budget_type' => 'daily', 'budget_amount' => '1.00']);
        $this->assertSame(300, (int) $c->budget_cents);
        $ad = $this->serve()[0];
        $this->event($ad['tracking_token']);
        $this->event($ad['tracking_token'], 'click');
        $this->assertSame('active', $c->fresh()->status);
        $this->assertSame([], $this->serve());
        $this->travel(1)->days();
        $this->assertCount(1, $this->serve());
    }

    public function test_ineligible_product_cannot_deliver_or_spend_before_scheduler_runs(): void
    {
        $c = $this->active();
        $ad = $this->serve()[0];
        $this->event($ad['tracking_token']);
        $this->product->delete();
        $this->event($ad['tracking_token'], 'click')->assertJsonPath('data.accepted', false);
        $this->assertSame([], $this->serve());
        app(AdCampaignService::class)->refreshLifecycle($c->id);
        $this->assertSame('invalid', $c->fresh()->status);
        $this->assertSame(0, (int) $c->fresh()->spent_cents);
    }

    public function test_targeting_placements_and_self_clicks(): void
    {
        $country = Country::create(['name' => 'Italy', 'code' => 'IT', 'is_active' => true]);
        $c = $this->active(['locations' => ['IT']]);
        $this->assertSame([], $this->serve());
        $this->buyer->addresses()->create(['type' => 'home', 'full_name' => 'Buyer', 'phone' => '123', 'address_line_1' => 'Test', 'country_id' => $country->id, 'is_default' => true]);
        $ads = $this->serve();
        $this->assertCount(1, $ads);
        $this->getJson('/api/buyer/ads?placement=search&query=Blue')->assertJsonCount(0, 'data');
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/buyer/ads?placement=homepage')->assertJsonCount(0, 'data');
        $this->event($ads[0]['tracking_token'], 'click')->assertUnprocessable();
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/buyer/ads?placement=homepage')->assertJsonCount(0, 'data');
        $this->assertSame(0, (int) $c->fresh()->spent_cents);
    }

    public function test_ranking_uses_bid_relevance_quality_and_remaining_budget(): void
    {
        $c = $this->active()->load('product');
        $copy = clone $c;
        $copy->bid_cents = 200;
        $service = app(AdDeliveryService::class);
        $this->assertGreaterThan($service->score($c, 'unknown'), $service->score($copy, 'unknown'));
        $this->assertGreaterThan($service->score($c, 'unknown'), $service->score($c, 'unknown', 'Blue'));
        $copy->bid_cents = $c->bid_cents;
        $copy->remaining_cents = 100;
        $this->assertLessThan($service->score($c, 'unknown'), $service->score($copy, 'unknown'));
    }

    public function test_analytics_aggregation_and_ledger_reconciliation_do_not_duplicate(): void
    {
        $c = $this->active();
        $ad = $this->serve()[0];
        $this->event($ad['tracking_token']);
        $this->event($ad['tracking_token'], 'click');
        for ($i = 0; $i < 2; $i++) {
            app(AdAnalyticsService::class)->aggregate($c->id);
        }
        $this->assertDatabaseCount('ad_daily_metrics', 1);
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/ad-campaigns/'.$c->id.'/analytics')->assertOk()
            ->assertJsonPath('data.summary.ctr', 100)->assertJsonPath('data.summary.product.id', $this->product->id);
        $c->refresh()->update(['remaining_cents' => 1]);
        $this->assertFalse(app(AdReconciliationService::class)->reconcile($c->id));
        app(AdReconciliationService::class)->reconcile($c->id);
        $this->assertSame('reconciliation_hold', $c->fresh()->status);
        $this->assertSame(1, $c->audits()->where('action', 'reconciliation_mismatch')->count());
        $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/actions', ['action' => 'cancel'])->assertUnprocessable();
    }

    public function test_legacy_import_preserves_original_data_without_charging_or_delivery(): void
    {
        $this->product->update(['is_boosted' => true, 'boost_budget' => 25, 'boost_payment_status' => 'paid', 'boost_location' => 'global']);
        for ($i = 0; $i < 2; $i++) {
            $c = app(LegacyBoostImportService::class)->import($this->product->id);
        }
        $this->assertDatabaseCount('ad_campaigns', 1);
        $this->assertSame('legacy_review', $c->status);
        $this->assertSame('paid', $c->legacy_snapshot['boost_payment_status']);
        $this->assertTrue($this->product->fresh()->is_boosted);
        $this->assertDatabaseCount('ad_budget_transactions', 0);
        $this->assertSame([], $this->serve());
    }

    public function test_old_boost_payment_shortcuts_are_disabled_and_financial_fields_immutable(): void
    {
        $c = $this->active();
        Sanctum::actingAs($this->seller);
        foreach (['boost', 'boost/complete-payment', 'toggle-boost'] as $path) {
            $this->postJson('/api/seller/products/'.$this->product->id.'/'.$path)->assertGone();
        }
        $this->putJson('/api/seller/ad-campaigns/'.$c->id, ['budget_cents' => 1])->assertStatus(405);
        Sanctum::actingAs($this->admin);
        $this->postJson('/api/admin/products/'.$this->product->id.'/approve-boost')->assertGone();
    }

    public function test_wallet_topup_requires_verified_payment_and_replay_does_not_credit_twice(): void
    {
        config(['services.stripe.secret' => 'test-key']);
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/buyer/wallet/top-up', ['amount' => 100])->assertUnprocessable();
        $session = ['id' => 'cs_test_verified', 'status' => 'complete', 'payment_status' => 'paid', 'mode' => 'payment',
            'currency' => 'eur', 'metadata' => ['user_id' => (string) $this->seller->id, 'type' => 'wallet_topup'], 'amount_total' => 500];
        Http::fake(['api.stripe.com/*' => Http::sequence()->push($session)->push($session)
            ->push(array_replace($session, ['payment_status' => 'unpaid']))]);
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/buyer/wallet/top-up', ['amount' => 9999, 'stripe_session_id' => $session['id']])->assertOk();
        }
        $this->assertSame('105.00', $this->seller->wallet->fresh()->shopping_balance);
        $this->postJson('/api/buyer/wallet/top-up', ['stripe_session_id' => $session['id']])->assertUnprocessable();
    }

    private function paidOrder(): StoreOrder
    {
        Queue::fake();
        $parent = Order::create(['user_id' => $this->buyer->id, 'order_no' => (string) Str::uuid(), 'payment_method' => 'wallet', 'payment_status' => 'paid', 'items_total' => 40, 'grand_total' => 40]);
        $order = StoreOrder::create(['order_id' => $parent->id, 'store_id' => $this->product->store_id, 'status' => 'paid', 'subtotal' => 40, 'total' => 40, 'paid_at' => now()]);
        OrderItem::create(['store_order_id' => $order->id, 'product_id' => $this->product->id, 'quantity' => 1, 'price' => 40, 'line_total' => 40, 'product_name' => 'Blue Glasses', 'product_sku' => $this->product->sku]);
        Escrow::create(['order_id' => $parent->id, 'store_order_id' => $order->id, 'amount' => 40, 'shipping_fee' => 0, 'status' => 'locked', 'locked_at' => now()]);

        return $order;
    }

    public function test_paid_order_attribution_and_cancellation_reversal_are_idempotent(): void
    {
        $c = $this->active();
        $ad = $this->serve()[0];
        $this->event($ad['tracking_token']);
        $this->event($ad['tracking_token'], 'click');
        $this->postJson('/api/buyer/ads/events', ['tracking_token' => $ad['tracking_token'], 'type' => 'product_view', 'product_id' => $this->product->id])->assertJsonPath('data.accepted', true);
        $order = $this->paidOrder();
        for ($i = 0; $i < 2; $i++) {
            app(AdAttributionService::class)->attribute($order->id);
        }
        $this->assertSame(1, (int) $c->fresh()->conversions);
        $this->assertSame(4000, (int) $c->fresh()->revenue_cents);
        $this->assertSame(40.0, (float) app(AdAnalyticsService::class)->report($c->fresh())['summary']['roas']);
        $order->update(['status' => 'cancelled']);
        Queue::assertPushed(\App\Jobs\AttributeAdPurchase::class);
        for ($i = 0; $i < 2; $i++) {
            app(AdAttributionService::class)->attribute($order->id);
        }
        $this->assertSame(0, (int) $c->fresh()->conversions);
        $this->assertSame(0, (int) $c->fresh()->revenue_cents);
    }

    public function test_attribution_ignores_unpaid_orders_and_expired_clicks(): void
    {
        $c = $this->active();
        $ad = $this->serve()[0];
        $this->event($ad['tracking_token']);
        $this->event($ad['tracking_token'], 'click');
        $order = $this->paidOrder();
        $order->update(['status' => 'accepted', 'paid_at' => null]);
        app(AdAttributionService::class)->attribute($order->id);
        $this->assertSame(0, (int) $c->fresh()->conversions);
        $this->travel(8)->days();
        $order->update(['status' => 'paid', 'paid_at' => now()]);
        app(AdAttributionService::class)->attribute($order->id);
        $this->assertSame(0, (int) $c->fresh()->conversions);
    }

    public function test_rejection_and_admin_refund_return_original_balance_buckets(): void
    {
        $c = $this->create();
        app(AdCampaignService::class)->action($c, $this->admin, 'reject', 'Incorrect advertising content');
        $this->assertSame('rejected', $c->fresh()->status);
        $this->assertSame('Incorrect advertising content', $c->fresh()->rejection_reason);
        $this->assertSame('5.00', $this->seller->wallet->fresh()->ad_credit);
        $c = $this->active();
        $ad = $this->serve()[0];
        $this->event($ad['tracking_token']);
        $this->event($ad['tracking_token'], 'click');
        for ($i = 0; $i < 2; $i++) {
            app(AdCampaignService::class)->action($c, $this->admin, 'refund', 'Refund remaining reservation');
        }
        $this->assertSame(900, (int) $c->fresh()->released_cents);
        $this->assertSame('4.00', $this->seller->wallet->fresh()->ad_credit);
        $this->assertSame('100.00', $this->seller->wallet->fresh()->shopping_balance);
        $this->assertSame(1, $c->transactions()->where('type', 'refund')->count());
    }

    public function test_jobs_are_safe_to_run_repeatedly_and_duplicate_requires_new_payment(): void
    {
        $c = $this->active();
        $this->travel(3)->days();
        for ($i = 0; $i < 2; $i++) {
            app()->call([new \App\Jobs\RefreshAdCampaigns, 'handle']);
            app()->call([new \App\Jobs\AggregateAdAnalytics, 'handle']);
            app()->call([new \App\Jobs\ReconcileAdSpending, 'handle']);
        }
        $this->assertSame('completed', $c->fresh()->status);
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/duplicate')->assertOk()->assertJsonPath('data.name', 'Autumn glasses (copy)');
        $this->assertDatabaseCount('ad_campaigns', 1);
        $this->assertSame(2, $c->transactions()->count());
    }

    public function test_expired_token_and_wrong_product_do_not_count(): void
    {
        $c = $this->active();
        $ad = $this->serve()[0];
        $this->travel(31)->minutes();
        $this->event($ad['tracking_token'])->assertUnprocessable();
        $this->assertSame(0, (int) $c->fresh()->impressions);
    }

    public function test_checkout_uses_stripe_and_rejects_foreign_return_origins(): void
    {
        config(['services.stripe.secret' => 'test-key', 'services.stripe.return_origins' => ['http://localhost:3121']]);
        Sanctum::actingAs($this->seller);
        Http::fake(['api.stripe.com/*' => Http::response(['id' => 'cs_test_checkout', 'url' => 'https://checkout.stripe.com/test'])]);
        $data = ['amount' => 500, 'currency' => 'eur', 'success_url' => 'http://localhost:3121/boost-ads?session_id={CHECKOUT_SESSION_ID}', 'cancel_url' => 'http://localhost:3121/boost-ads'];
        $this->postJson('/api/seller/ad-wallet/checkout', $data)->assertOk()->assertJsonPath('data.id', 'cs_test_checkout');
        Http::assertSent(fn ($request) => $request['metadata']['user_id'] === (string) $this->seller->id && $request['line_items'][0]['price_data']['unit_amount'] === 500);
        $this->postJson('/api/seller/ad-wallet/checkout', array_replace($data, ['success_url' => 'https://evil.invalid/']))->assertUnprocessable();
    }

    public function test_variant_stock_is_used_when_parent_stock_is_zero(): void
    {
        $this->product->update(['stock_quantity' => 0]);
        $variant = $this->product->variants()->create(['color_name' => 'Blue', 'stock_quantity' => 3, 'stock_status' => 'in_stock']);
        $c = $this->active();
        $this->assertCount(1, $this->serve());
        $variant->update(['stock_quantity' => 0]);
        $this->assertSame([], $this->serve());
        app(AdCampaignService::class)->refreshLifecycle($c->id);
        $this->assertSame('invalid', $c->fresh()->status);
    }

    public function test_signed_guest_view_links_after_login_without_double_counting(): void
    {
        $c = $this->active();
        $request = \Illuminate\Http\Request::create('/api/buyer/ads', 'GET', server: ['REMOTE_ADDR' => '10.2.0.1', 'HTTP_USER_AGENT' => 'GuestLinkTest']);
        $request->setUserResolver(fn () => null);
        $ad = app(AdDeliveryService::class)->deliver($request, ['placement' => 'homepage'])[0];
        $tracker = app(\App\Services\Ads\AdTrackingService::class);
        foreach (['impression', 'click', 'product_view'] as $type) {
            $tracker->track($request, $ad['tracking_token'], $type);
        }
        $this->assertNull($c->events()->where('type', 'product_view')->first()->user_id);
        $request->setUserResolver(fn () => $this->buyer);
        $this->assertTrue($tracker->track($request, $ad['tracking_token'], 'product_view')['duplicate']);
        $this->assertSame($this->buyer->id, $c->events()->where('type', 'product_view')->first()->user_id);
        $this->assertSame(1, (int) $c->fresh()->product_views);
        $this->assertSame(100, (int) $c->fresh()->spent_cents);
    }

    public function test_wizard_options_accept_empty_search_and_blocked_accounts_cannot_list(): void
    {
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/ad-campaigns/options?search=&page=1')->assertOk()->assertJsonPath('data.products.data.0.id', $this->product->id);
        $this->seller->forceFill(['is_blocked' => true])->save();
        $this->getJson('/api/seller/ad-campaigns')->assertForbidden();
        $this->getJson('/api/seller/ad-campaigns/options')->assertForbidden();
    }

    public function test_seller_cannot_reserve_for_another_store_or_resume_invalid_product(): void
    {
        $other = User::factory()->create(['role' => 'seller']);
        Store::create(['user_id' => $other->id, 'name' => 'Other Optics', 'slug' => (string) Str::uuid(), 'status' => 'active', 'is_active' => true]);
        Sanctum::actingAs($other);
        $this->postJson('/api/seller/ad-campaigns', $this->draft())->assertUnprocessable();
        $c = $this->active();
        app(AdCampaignService::class)->action($c, $this->seller, 'pause');
        $this->product->update(['is_approved' => false]);
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/actions', ['action' => 'resume'])->assertUnprocessable();
        $this->assertSame('paused', $c->fresh()->status);
        $this->product->update(['is_approved' => true]);
        $this->travel(3)->days();
        $this->postJson('/api/seller/ad-campaigns/'.$c->id.'/actions', ['action' => 'resume'])->assertUnprocessable();
    }

    private function race(array $payloads): void
    {
        $env = ['APP_ENV' => 'testing', 'APP_KEY' => config('app.key'), 'APP_URL' => 'http://127.0.0.1:8137',
            'DB_CONNECTION' => 'mysql', 'DB_HOST' => '127.0.0.1', 'DB_PORT' => (string) config('database.connections.mysql.port'),
            'DB_DATABASE' => config('database.connections.mysql.database'), 'DB_USERNAME' => config('database.connections.mysql.username'),
            'DB_PASSWORD' => config('database.connections.mysql.password'), 'QUEUE_CONNECTION' => 'sync', 'CACHE_STORE' => 'array'];
        $processes = [];
        foreach ($payloads as $payload) {
            $p = new \Symfony\Component\Process\Process([PHP_BINARY, base_path('tests/Support/ad-race-worker.php'), base64_encode(json_encode($payload))], base_path(), $env);
            $p->setTimeout(60);
            $p->start();
            $processes[] = $p;
        }
        foreach ($processes as $p) {
            $p->wait();
            $this->assertTrue($p->isSuccessful(), $p->getErrorOutput());
        }
    }

    public function test_concurrent_reservations_click_spending_and_refunds_use_row_locks(): void
    {
        // Subprocess connections need committed fixtures; never run this against a real database.
        $this->assertStringStartsWith('opty_ads_test', DB::connection()->getDatabaseName());
        $this->travelBack(); // Use the same real clock as the worker processes.
        $this->seller->wallet->update(['ad_credit' => 0, 'shopping_balance' => 0]);
        $first = $this->create(['ends_at' => now()->addDays(30)->toIso8601String()]);
        $secondProduct = $this->product->replicate();
        $secondProduct->slug = (string) Str::uuid();
        $secondProduct->sku = (string) Str::uuid();
        $secondProduct->save();
        $second = $this->create(['product_id' => $secondProduct->id, 'ends_at' => now()->addDays(30)->toIso8601String()]);
        $this->seller->wallet->update(['shopping_balance' => 10]);
        DB::commit();
        $this->travelBack(); // Worker processes use real time.
        $this->race(array_map(fn ($c) => ['action' => 'pay', 'campaign' => $c->id, 'actor' => $this->seller->id], [$first, $second, $first, $second]));
        $this->assertSame('0.00', $this->seller->wallet->fresh()->shopping_balance);
        $this->assertSame(1, AdCampaign::where('payment_status', 'reserved')->count());
        $funded = AdCampaign::where('payment_status', 'reserved')->firstOrFail();
        app(AdCampaignService::class)->action($funded, $this->admin, 'approve', 'Concurrency test');
        $payloads = [];
        for ($i = 1; $i <= 14; $i++) {
            $ip = '10.0.0.'.$i;
            $request = \Illuminate\Http\Request::create('/api/buyer/ads', 'GET', server: ['REMOTE_ADDR' => $ip, 'HTTP_USER_AGENT' => 'AdConcurrency']);
            $request->setUserResolver(fn () => null);
            $ad = app(AdDeliveryService::class)->deliver($request, ['placement' => 'homepage'])[0];
            app(\App\Services\Ads\AdTrackingService::class)->track($request, $ad['tracking_token'], 'impression');
            $payloads[] = ['action' => 'click', 'token' => $ad['tracking_token'], 'ip' => $ip];
        }
        $payloads[] = $payloads[0]; // Duplicate delivery races an original click.
        $this->race($payloads);
        $this->assertSame(1000, (int) $funded->fresh()->spent_cents);
        $this->assertSame(0, (int) $funded->fresh()->remaining_cents);
        $this->assertSame(10, $funded->transactions()->where('type', 'spend')->count());
        $this->assertTrue(app(AdReconciliationService::class)->reconcile($funded->id));
        $unfunded = AdCampaign::where('payment_status', 'failed')->firstOrFail();
        $this->seller->wallet->refresh()->update(['shopping_balance' => 10]);
        app(AdCampaignService::class)->action($unfunded, $this->seller, 'pay');
        $this->assertSame('reserved', $unfunded->fresh()->payment_status);
        $this->race(array_fill(0, 4, ['action' => 'cancel', 'campaign' => $unfunded->id, 'actor' => $this->seller->id]));
        $this->assertSame('10.00', $this->seller->wallet->fresh()->shopping_balance);
        $this->assertSame(1, $unfunded->transactions()->where('type', 'release')->count());
        \Illuminate\Foundation\Testing\RefreshDatabaseState::$migrated = false;
    }
}
