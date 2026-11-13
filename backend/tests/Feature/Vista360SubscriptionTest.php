<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Vista360Plan;
use App\Models\Vista360Subscription;
use App\Services\Vista360\Vista360SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class Vista360SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    private User $seller;
    private Store $store;
    private Vista360Plan $plan;

    protected function beforeRefreshingDatabase(): void
    {
        // Marketplace feature tests deliberately require a disposable MySQL
        // database. This guard prevents a local developer command from ever
        // migrating or wiping a production-like marketplace database.
        if (! str_starts_with(config('database.connections.mysql.database'), 'opty_marketplace_test')) {
            throw new \RuntimeException('Disposable marketplace database required.');
        }
    }

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'vista360.enabled' => true,
            'vista360.crm_webhook_url' => null,
            'vista360.crm_webhook_secret' => null,
        ]);

        $this->seller = User::factory()->create(['role' => 'seller']);
        $this->store = Store::create([
            'user_id' => $this->seller->id,
            'name' => 'Subscription Optics',
            'slug' => (string) Str::uuid(),
            'status' => 'active',
            'is_active' => true,
        ]);
        $this->plan = Vista360Plan::create([
            'name' => 'Test Pro',
            'slug' => 'test-pro',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        $this->plan->prices()->create([
            'duration_months' => 1,
            'amount_cents' => 3900,
            'currency' => 'EUR',
            'version' => 1,
            'is_active' => true,
        ]);
        $this->plan->features()->createMany([
            ['feature_key' => 'crm.access', 'title' => 'CRM access', 'is_active' => true, 'sort_order' => 1],
            ['feature_key' => 'crm.products', 'title' => 'Products', 'is_active' => true, 'sort_order' => 2],
        ]);
    }

    public function test_expired_subscription_is_reconciled_and_can_no_longer_authorize_crm_access(): void
    {
        $subscription = $this->subscription(Vista360Subscription::ACTIVE, now()->subMonth(), now()->subMinute());

        $entitlement = app(Vista360SubscriptionService::class)->entitlement($this->seller, $this->store);

        $this->assertFalse($entitlement['active']);
        $this->assertSame(Vista360Subscription::EXPIRED, $subscription->fresh()->status);
        $this->assertDatabaseHas('vista360_subscription_events', [
            'vista360_subscription_id' => $subscription->id,
            'event' => 'subscription.expired',
        ]);
    }

    public function test_active_snapshot_preserves_features_and_admin_suspension_removes_access(): void
    {
        $subscription = $this->subscription(Vista360Subscription::ACTIVE, now()->subMinute(), now()->addMonth());
        $service = app(Vista360SubscriptionService::class);

        $active = $service->entitlement($this->seller, $this->store);
        $this->assertTrue($active['active']);
        $this->assertSame('crm.products', $active['features'][1]['key']);

        $service->changeStatus($subscription, Vista360Subscription::SUSPENDED, null, 'Payment review');
        $suspended = $service->entitlement($this->seller, $this->store);

        $this->assertFalse($suspended['active']);
        $this->assertSame(Vista360Subscription::SUSPENDED, $suspended['status']);
    }

    public function test_current_access_keeps_paid_scheduled_renewals_visible_without_replacing_the_active_term(): void
    {
        $active = $this->subscription(Vista360Subscription::ACTIVE, now()->subDay(), now()->addMonth());
        $scheduled = $this->subscription(Vista360Subscription::SCHEDULED, now()->addMonth(), now()->addMonths(2));

        $current = app(Vista360SubscriptionService::class)->current($this->seller, $this->store);

        $this->assertSame($active->uuid, $current['subscription']['id']);
        $this->assertCount(1, $current['future_subscriptions']);
        $this->assertSame($scheduled->uuid, $current['future_subscriptions'][0]['id']);
        $this->assertSame(Vista360Subscription::SCHEDULED, $current['future_subscriptions'][0]['status']);
        $this->assertTrue($current['entitlement']['active']);
    }

    public function test_seller_cancellation_removes_only_future_renewals_and_keeps_the_current_term_active(): void
    {
        $active = $this->subscription(Vista360Subscription::ACTIVE, now()->subDay(), now()->addMonth());
        $scheduled = $this->subscription(Vista360Subscription::SCHEDULED, now()->addMonth(), now()->addMonths(2));
        $service = app(Vista360SubscriptionService::class);

        $this->assertSame(1, $service->cancelFutureRenewals($this->seller, $this->store, 'Seller changed plan'));

        $this->assertSame(Vista360Subscription::ACTIVE, $active->fresh()->status);
        $this->assertSame(Vista360Subscription::CANCELLED, $scheduled->fresh()->status);
        $this->assertTrue($service->entitlement($this->seller, $this->store)['active']);
        $this->assertDatabaseHas('vista360_subscription_events', [
            'vista360_subscription_id' => $scheduled->id,
            'event' => 'subscription.cancelled',
        ]);
    }

    private function subscription(string $status, $startsAt, $expiresAt): Vista360Subscription
    {
        return Vista360Subscription::create([
            'uuid' => (string) Str::uuid(),
            'seller_id' => $this->seller->id,
            'store_id' => $this->store->id,
            'vista360_plan_id' => $this->plan->id,
            'status' => $status,
            'source' => 'test',
            'plan_snapshot' => ['id' => $this->plan->id, 'name' => $this->plan->name, 'slug' => $this->plan->slug],
            'features_snapshot' => [
                ['key' => 'crm.access', 'title' => 'CRM access'],
                ['key' => 'crm.products', 'title' => 'Products'],
            ],
            'price_snapshot' => ['duration_months' => 1, 'amount_cents' => 3900, 'currency' => 'EUR'],
            'starts_at' => $startsAt,
            'expires_at' => $expiresAt,
            'activated_at' => $status === Vista360Subscription::ACTIVE ? now() : null,
            'entitlement_version' => 1,
        ]);
    }
}
