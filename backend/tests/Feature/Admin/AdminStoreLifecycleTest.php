<?php

namespace Tests\Feature\Admin;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminStoreLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    /* ----------------------------------------------------------------- *
     * Status visibility and filtering
     * ----------------------------------------------------------------- */

    public function test_list_exposes_status_and_separates_the_lifecycle_groups(): void
    {
        $pending = Store::factory()->pending()->create(['name' => 'Pending Shop']);
        $approved = Store::factory()->approved()->create(['name' => 'Approved Shop']);
        $rejected = Store::factory()->rejected()->create(['name' => 'Rejected Shop']);
        $suspended = Store::factory()->suspended()->create(['name' => 'Suspended Shop']);

        $all = $this->getJson('/api/admin/sellers')->assertOk()->json('data');
        $this->assertSame(4, $all['summary']['all']);
        $this->assertSame(1, $all['summary']['pending']);
        $this->assertSame(1, $all['summary']['approved']);
        $this->assertSame(1, $all['summary']['rejected']);
        $this->assertSame(1, $all['summary']['suspended']);

        $byStatus = fn (string $status) => collect(
            $this->getJson('/api/admin/sellers?status='.$status)->assertOk()->json('data.stores')
        )->pluck('id')->all();

        $this->assertSame([$pending->id], $byStatus('pending'));
        $this->assertSame([$approved->id], $byStatus('approved'));
        $this->assertSame([$rejected->id], $byStatus('rejected'));
        $this->assertSame([$suspended->id], $byStatus('suspended'));
    }

    public function test_a_new_registration_is_listed_as_pending_and_carries_no_rejection_reason(): void
    {
        Store::factory()->pending()->create();

        $store = $this->getJson('/api/admin/sellers?status=pending')->assertOk()->json('data.stores.0');

        $this->assertSame('pending', $store['status']);
        $this->assertTrue($store['is_active']);
        $this->assertNull($store['rejection_reason']);
    }

    public function test_unknown_status_filter_is_rejected(): void
    {
        $this->getJson('/api/admin/sellers?status=bogus')->assertStatus(422);
    }

    /* ----------------------------------------------------------------- *
     * Approve
     * ----------------------------------------------------------------- */

    public function test_admin_can_approve_a_pending_registration(): void
    {
        $store = Store::factory()->pending()->create();

        $this->postJson("/api/admin/sellers/{$store->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', Store::STATUS_ACTIVE)
            ->assertJsonPath('data.onboarding_status', Store::ONBOARDING_APPROVED);

        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'status' => Store::STATUS_ACTIVE,
            'onboarding_status' => Store::ONBOARDING_APPROVED,
            'is_active' => true,
        ]);

        Mail::assertSent(MarketplaceTransactionalMail::class);
    }

    public function test_approving_unhides_a_store_that_was_previously_rejected(): void
    {
        $store = Store::factory()->rejected()->create();

        $this->assertFalse($store->fresh()->is_active);

        $this->postJson("/api/admin/sellers/{$store->id}/approve")->assertOk();

        $store->refresh();
        $this->assertSame(Store::STATUS_ACTIVE, $store->status);
        $this->assertTrue($store->is_active);
        // The stale rejection reason must not survive a fresh approval.
        $this->assertNull($store->rejectionReason());
    }

    public function test_approving_an_already_approved_store_is_refused(): void
    {
        $store = Store::factory()->approved()->create();

        $this->postJson("/api/admin/sellers/{$store->id}/approve")->assertStatus(422);

        $this->assertDatabaseHas('stores', ['id' => $store->id, 'status' => Store::STATUS_ACTIVE]);
    }

    /* ----------------------------------------------------------------- *
     * Reject
     * ----------------------------------------------------------------- */

    public function test_admin_can_reject_a_pending_registration_and_it_moves_to_the_rejected_list(): void
    {
        $store = Store::factory()->pending()->create();

        $this->postJson("/api/admin/sellers/{$store->id}/reject", [
            'reason' => 'Business registration could not be verified.',
        ])->assertOk()->assertJsonPath('data.status', Store::STATUS_REJECTED);

        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'status' => Store::STATUS_REJECTED,
            'onboarding_status' => Store::ONBOARDING_REJECTED,
            'is_active' => false,
        ]);

        $rejected = $this->getJson('/api/admin/sellers?status=rejected')
            ->assertOk()
            ->json('data.stores.0');
        $this->assertSame($store->id, $rejected['id']);
        $this->assertSame('Business registration could not be verified.', $rejected['rejection_reason']);

        // It must no longer appear in the pending queue.
        $this->getJson('/api/admin/sellers?status=pending')
            ->assertOk()
            ->assertJsonPath('data.stores', []);
    }

    public function test_rejecting_requires_a_reason(): void
    {
        $store = Store::factory()->pending()->create();

        $this->postJson("/api/admin/sellers/{$store->id}/reject")
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');

        $this->postJson("/api/admin/sellers/{$store->id}/reject", ['reason' => 'x'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');

        $this->assertDatabaseHas('stores', ['id' => $store->id, 'status' => Store::STATUS_PENDING]);
    }

    public function test_rejecting_an_already_rejected_store_is_refused(): void
    {
        $store = Store::factory()->rejected()->create();

        $this->postJson("/api/admin/sellers/{$store->id}/reject", ['reason' => 'Still invalid.'])
            ->assertStatus(422);
    }

    public function test_rejecting_notifies_the_seller(): void
    {
        $store = Store::factory()->pending()->create();

        $this->postJson("/api/admin/sellers/{$store->id}/reject", ['reason' => 'Missing tax number.'])
            ->assertOk();

        Mail::assertSent(MarketplaceTransactionalMail::class);
    }

    /* ----------------------------------------------------------------- *
     * Detail view
     * ----------------------------------------------------------------- */

    public function test_store_detail_exposes_products_orders_and_the_deletable_flag(): void
    {
        $store = Store::factory()->approved()->create();
        Product::factory()->count(2)->create(['store_id' => $store->id]);

        $data = $this->getJson("/api/admin/sellers/{$store->id}")->assertOk()->json('data');

        $this->assertSame($store->id, $data['store']['id']);
        $this->assertSame(2, $data['store']['products_count']);
        $this->assertCount(2, $data['products']);
        $this->assertSame([], $data['orders']);
        $this->assertTrue($data['deletable']);
    }

    /* ----------------------------------------------------------------- *
     * Deletion
     * ----------------------------------------------------------------- */

    public function test_admin_can_delete_a_store_and_all_of_its_content(): void
    {
        $store = Store::factory()->approved()->create(['name' => 'Doomed Optics']);
        $other = Store::factory()->approved()->create();

        $products = Product::factory()->count(3)->create(['store_id' => $store->id]);
        $foreignProduct = Product::factory()->create(['store_id' => $other->id]);

        $this->seedStoreContent($store);

        $storeId = $store->id;
        $productIds = $products->pluck('id')->all();

        $this->deleteJson("/api/admin/sellers/{$storeId}")->assertOk();

        // The store row is really gone, not soft deleted.
        $this->assertDatabaseMissing('stores', ['id' => $storeId]);
        $this->assertNull(Store::withTrashed()->find($storeId));

        foreach ($productIds as $productId) {
            $this->assertDatabaseMissing('products', ['id' => $productId]);
        }

        // Everything store-owned is gone...
        $this->assertSame(0, DB::table('store_banners')->where('store_id', $storeId)->count());
        $this->assertSame(0, DB::table('store_announcements')->where('store_id', $storeId)->count());
        $this->assertSame(0, DB::table('discount_campaigns')->where('store_id', $storeId)->count());
        $this->assertSame(0, DB::table('banner_campaigns')->where('store_id', $storeId)->count());
        $this->assertSame(0, DB::table('banner_creatives')->count());
        $this->assertSame(0, DB::table('referral_campaigns')->where('store_id', $storeId)->count());
        $this->assertSame(0, DB::table('store_reviews')->where('store_id', $storeId)->count());
        $this->assertSame(0, DB::table('store_followers')->where('store_id', $storeId)->count());
        $this->assertSame(0, DB::table('store_statistics')->where('store_id', $storeId)->count());

        // ...and nothing else was collaterally destroyed.
        $this->assertDatabaseHas('products', ['id' => $foreignProduct->id]);
        $this->assertDatabaseHas('stores', ['id' => $other->id]);
    }

    public function test_deletion_leaves_no_orphaned_campaign_pivots(): void
    {
        $store = Store::factory()->approved()->create();
        $product = Product::factory()->create(['store_id' => $store->id]);

        $campaignId = DB::table('discount_campaigns')->insertGetId([
            'store_id' => $store->id, 'name' => 'Autumn sale', 'scope' => 'store',
            'discount_type' => 'percentage', 'discount_value' => 10, 'status' => 'draft',
            'starts_at' => now(), 'ends_at' => now()->addWeek(),
        ]);
        DB::table('discount_campaign_products')->insert([
            'discount_campaign_id' => $campaignId, 'product_id' => $product->id,
        ]);

        $this->deleteJson("/api/admin/sellers/{$store->id}")->assertOk();

        $this->assertDatabaseMissing('discount_campaigns', ['id' => $campaignId]);
        $this->assertDatabaseMissing('discount_campaign_products', ['discount_campaign_id' => $campaignId]);
    }

    public function test_deletion_is_refused_when_the_store_has_orders(): void
    {
        $store = Store::factory()->approved()->create();
        $buyer = User::factory()->create();
        $order = DB::table('orders')->insertGetId([
            'user_id' => $buyer->id, 'order_no' => 'ORD-1', 'payment_status' => 'paid',
            'items_total' => 10, 'grand_total' => 10,
        ]);
        DB::table('store_orders')->insert([
            'order_id' => $order, 'store_id' => $store->id,
            'status' => 'delivered', 'subtotal' => 10, 'total' => 10,
        ]);

        $this->deleteJson("/api/admin/sellers/{$store->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('store');

        $this->assertDatabaseHas('stores', ['id' => $store->id]);
        // The order and its store_order must survive untouched.
        $this->assertDatabaseHas('orders', ['id' => $order]);
        $this->assertDatabaseHas('store_orders', ['store_id' => $store->id]);

        $this->getJson("/api/admin/sellers/{$store->id}")
            ->assertOk()
            ->assertJsonPath('data.deletable', false);
    }

    public function test_deletion_is_refused_when_the_store_has_wallet_movement(): void
    {
        $store = Store::factory()->approved()->create();
        $walletId = DB::table('seller_wallets')->insertGetId(['store_id' => $store->id]);
        DB::table('seller_wallet_entries')->insert([
            'seller_wallet_id' => $walletId, 'reference' => 'ref-1', 'type' => 'earning',
            'amount' => 25, 'deltas' => '{}', 'balances_after' => '{}',
        ]);

        $this->deleteJson("/api/admin/sellers/{$store->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('store');

        $this->assertDatabaseHas('stores', ['id' => $store->id]);
        $this->assertDatabaseHas('seller_wallet_entries', ['seller_wallet_id' => $walletId]);
    }

    public function test_deletion_is_refused_when_the_store_has_spent_ad_budget(): void
    {
        $store = Store::factory()->approved()->create();
        $product = Product::factory()->create(['store_id' => $store->id]);
        DB::table('ad_campaigns')->insert([
            'seller_id' => $store->user_id, 'product_id' => $product->id, 'name' => 'Boost',
            'status' => 'active', 'payment_status' => 'paid', 'currency' => 'EUR',
            'starts_at' => now(), 'ends_at' => now()->addWeek(), 'budget_type' => 'daily',
            'budget_amount_cents' => 1000, 'budget_cents' => 1000, 'bid_type' => 'cpc',
            'bid_cents' => 50, 'locations' => '[]', 'placements' => '[]',
            'spent_cents' => 500, 'idempotency_key' => 'key-1', 'request_hash' => 'hash-1',
        ]);

        $this->deleteJson("/api/admin/sellers/{$store->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('store');

        $this->assertDatabaseHas('stores', ['id' => $store->id]);
    }

    public function test_an_untouched_wallet_without_movement_does_not_block_deletion(): void
    {
        $store = Store::factory()->approved()->create();
        DB::table('seller_wallets')->insert(['store_id' => $store->id]);

        $this->deleteJson("/api/admin/sellers/{$store->id}")->assertOk();

        $this->assertDatabaseMissing('stores', ['id' => $store->id]);
        $this->assertDatabaseMissing('seller_wallets', ['store_id' => $store->id]);
    }

    /* ----------------------------------------------------------------- *
     * Notifications / unread sidebar dots
     * ----------------------------------------------------------------- */

    public function test_a_new_store_registration_notifies_admins(): void
    {
        $seller = User::factory()->seller()->create();
        $admin = $this->admin;

        $store = app(\App\Services\Store\StoreService::class)->getStore($seller);

        $this->assertSame(Store::STATUS_PENDING, $store->status);
        $this->assertSame(
            1,
            $admin->notifications()->where('data->event', 'store.registration_requested')->count()
        );
    }

    public function test_live_summary_counts_pending_registrations_as_seller_work(): void
    {
        Store::factory()->count(2)->pending()->create();
        Store::factory()->approved()->create();

        $data = $this->getJson('/api/admin/live-summary')->assertOk()->json('data');

        $this->assertSame(2, $data['sellers']);
        $this->assertSame(2, $data['sections']['sellers']['total']);
        // Never viewed: everything pending reads as unread.
        $this->assertSame(2, $data['sections']['sellers']['unread']);
        $this->assertNull($data['sections']['sellers']['viewed_at']);
    }

    public function test_marking_the_sellers_section_viewed_clears_its_dot(): void
    {
        Store::factory()->count(2)->pending()->create();

        $this->postJson('/api/admin/live-summary/viewed', ['sections' => ['sellers']])
            ->assertOk()
            ->assertJsonPath('data.sections.sellers.unread', 0);

        $data = $this->getJson('/api/admin/live-summary')->assertOk()->json('data');
        $this->assertSame(0, $data['sections']['sellers']['unread']);
        $this->assertSame(2, $data['sections']['sellers']['total']);
        $this->assertNotNull($data['sections']['sellers']['viewed_at']);

        // Viewing one section must not clear the others.
        $this->assertArrayHasKey('orders', $data['sections']);
        $this->assertNull($data['sections']['orders']['viewed_at']);
    }

    public function test_a_new_registration_after_viewing_re_raises_the_dot(): void
    {
        Store::factory()->pending()->create();
        $this->postJson('/api/admin/live-summary/viewed', ['sections' => ['sellers']])->assertOk();

        $this->assertSame(0, $this->getJson('/api/admin/live-summary')->json('data.sections.sellers.unread'));

        // Stored timestamps have second precision, so move the clock forward
        // rather than relying on two events landing in the same second.
        $this->travel(2)->seconds();
        Store::factory()->pending()->create();

        $this->assertSame(1, $this->getJson('/api/admin/live-summary')->json('data.sections.sellers.unread'));
    }

    public function test_viewed_rejects_unknown_sections(): void
    {
        $this->postJson('/api/admin/live-summary/viewed', ['sections' => ['nope']])
            ->assertStatus(422)
            ->assertJsonValidationErrors('sections.0');
    }

    public function test_viewed_state_is_per_admin(): void
    {
        Store::factory()->pending()->create();
        $this->postJson('/api/admin/live-summary/viewed', ['sections' => ['sellers']])->assertOk();

        $otherAdmin = User::factory()->admin()->create();
        Sanctum::actingAs($otherAdmin);

        $this->assertSame(1, $this->getJson('/api/admin/live-summary')->json('data.sections.sellers.unread'));
    }

    public function test_non_admins_cannot_reach_store_management(): void
    {
        Sanctum::actingAs(User::factory()->seller()->create());

        $this->getJson('/api/admin/sellers')->assertStatus(403);
        $this->postJson('/api/admin/live-summary/viewed', ['sections' => ['sellers']])->assertStatus(403);
    }

    /**
     * Give the store a spread of owned content: legacy banners, announcements
     * and a referral campaign (all of which reference the store directly).
     */
    private function seedStoreContent(Store $store): void
    {
        DB::table('store_banners')->insert([
            'store_id' => $store->id, 'title' => 'Summer sale', 'image' => 'banners/a.jpg',
            'link' => '/products', 'is_active' => true, 'position' => 'top',
        ]);

        DB::table('store_announcements')->insert([
            'store_id' => $store->id, 'title' => 'Notice', 'message' => 'We are open.',
            'is_active' => true,
        ]);

        DB::table('referral_campaigns')->insert([
            'store_id' => $store->id, 'seller_id' => $store->user_id,
            'name' => 'Refer a friend', 'identifier' => 'ref-'.$store->id,
            'scope_type' => 'store', 'reward_type' => 'fixed', 'reward_amount' => 10,
            'budget_amount' => 100, 'starts_at' => now(),
        ]);
    }
}