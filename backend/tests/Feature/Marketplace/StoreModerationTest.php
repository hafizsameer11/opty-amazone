<?php

namespace Tests\Feature\Marketplace;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StoreModerationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $seller;
    private User $buyer;
    private Store $store;
    private StoreReport $report;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        $this->admin = User::factory()->admin()->create();
        $this->seller = User::factory()->seller()->create();
        $this->buyer = User::factory()->create();
        $this->store = Store::factory()->create(['user_id' => $this->seller->id, 'status' => 'active', 'is_active' => true]);
        $this->product = Product::factory()->create(['store_id' => $this->store->id, 'is_active' => true, 'is_approved' => true, 'is_muted' => false]);
        $this->report = StoreReport::create([
            'buyer_id' => $this->buyer->id,
            'store_id' => $this->store->id,
            'reason' => 'counterfeit',
            'details' => 'The listing appears to use a copied brand identity.',
            'status' => StoreReport::STATUS_SUBMITTED,
        ]);
    }

    public function test_admin_can_warn_suspend_and_restore_a_reported_store_without_exposing_it_to_buyers(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/store-reports/{$this->report->id}/warn", ['reason' => 'Please clarify the product sourcing.'])
            ->assertOk()->assertJsonPath('data.report.status', StoreReport::STATUS_WAITING_FOR_SELLER);
        Mail::assertSent(MarketplaceTransactionalMail::class);

        $this->postJson("/api/admin/store-reports/{$this->report->id}/suspend", ['reason' => 'Repeated unresolved counterfeit reports.'])
            ->assertOk()->assertJsonPath('data.store.status', 'suspended');
        $this->assertDatabaseHas('stores', ['id' => $this->store->id, 'status' => 'suspended', 'is_active' => false]);

        // A suspended store and its products are unavailable through both the
        // public catalogue and the buyer's direct store detail endpoint.
        $this->getJson('/api/stores/'.$this->store->id)->assertNotFound();
        $this->getJson('/api/products/'.$this->product->id)->assertNotFound();
        Sanctum::actingAs($this->buyer);
        $this->getJson('/api/buyer/stores/'.$this->store->id)->assertNotFound();

        // The seller cannot operate the hub, but can access the narrowly
        // scoped reinstatement flow.
        Sanctum::actingAs($this->seller);
        $this->getJson('/api/seller/products')->assertForbidden();
        $requestId = $this->postJson('/api/seller/store/reinstatement-requests', ['reason' => 'We removed the listing and completed the requested review.'])
            ->assertCreated()->json('data.request.id');

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/store-reports/reinstatements/{$requestId}/decision", ['action' => 'approve'])
            ->assertOk()->assertJsonPath('data.request.status', 'approved');
        $this->assertDatabaseHas('stores', ['id' => $this->store->id, 'status' => 'active', 'is_active' => true]);

        Sanctum::actingAs($this->buyer);
        $this->getJson('/api/buyer/stores/'.$this->store->id)->assertOk();
    }

    public function test_admin_report_summary_includes_store_counts_and_pending_reinstatements(): void
    {
        StoreReport::create(['buyer_id' => $this->buyer->id, 'store_id' => $this->store->id, 'reason' => 'scam', 'status' => StoreReport::STATUS_UNDER_REVIEW]);
        Sanctum::actingAs($this->admin);
        $this->getJson('/api/admin/store-reports')
            ->assertOk()
            ->assertJsonPath('data.summary.total_reports', 2)
            ->assertJsonPath('data.summary.reported_stores', 1)
            ->assertJsonPath('data.reports.0.store.reports_count', 2);
    }

    public function test_admin_can_remove_a_reported_store_without_deleting_its_audit_history(): void
    {
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/store-reports/{$this->report->id}/remove", ['reason' => 'Confirmed fraudulent activity.'])
            ->assertOk()
            ->assertJsonPath('data.store.status', 'rejected');

        $this->assertDatabaseHas('stores', ['id' => $this->store->id, 'status' => 'rejected', 'is_active' => false]);
        $this->assertDatabaseHas('store_reports', ['id' => $this->report->id]);
        Mail::assertSent(MarketplaceTransactionalMail::class);

        // Removal preserves an auditable record; it remains eligible for an
        // explicit admin-approved reinstatement rather than becoming an
        // orphaned seller account.
        Sanctum::actingAs($this->seller);
        $this->postJson('/api/seller/store/reinstatement-requests', ['reason' => 'We would like the removal decision reviewed by the marketplace.'])
            ->assertCreated();
    }
}
