<?php

namespace Tests\Feature\Seller;

use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The seller API refuses most endpoints while a store is suspended so the
 * frontend can route the seller to the reinstatement screen. These tests lock
 * that contract in, because the dashboard is the first screen a suspended
 * seller loads.
 */
class SuspendedStoreAccessTest extends TestCase
{
    use RefreshDatabase;

    private function seller(?callable $configureStore = null): User
    {
        $seller = User::factory()->create(['role' => 'seller']);

        $store = Store::create([
            'user_id' => $seller->id,
            'name' => 'Optics Test Store',
            'slug' => 'optics-test-store',
            'email' => $seller->email,
            'status' => 'pending',
            'is_active' => true,
            'onboarding_status' => 'pending',
            'onboarding_level' => 1,
            'onboarding_percent' => 0,
        ]);

        if ($configureStore) {
            $configureStore($store);
        }

        return $seller->fresh();
    }

    public function test_active_seller_is_not_blocked_by_the_suspension_guard(): void
    {
        $seller = $this->seller();

        Sanctum::actingAs($seller, ['seller']);

        $response = $this->getJson('/api/seller/store/dashboard');

        // The dashboard payload itself depends on seeded analytics, so only the
        // middleware decision is asserted here: it must not be a 403.
        $this->assertNotSame(403, $response->getStatusCode(), 'An active seller must not be blocked by the suspension guard.');
    }

    public function test_suspended_store_is_refused_the_dashboard_with_a_machine_readable_code(): void
    {
        $seller = $this->seller(function (Store $store) {
            $store->update(['status' => 'suspended']);
        });

        Sanctum::actingAs($seller, ['seller']);

        $this->getJson('/api/seller/store/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.code', 'store_suspended');
    }

    public function test_inactive_store_is_refused_the_same_way(): void
    {
        $seller = $this->seller(function (Store $store) {
            $store->update(['is_active' => false]);
        });

        Sanctum::actingAs($seller, ['seller']);

        $this->getJson('/api/seller/store/dashboard')
            ->assertStatus(403)
            ->assertJsonPath('errors.code', 'store_suspended');
    }

    public function test_suspended_store_can_still_read_its_own_state_and_reinstatement_requests(): void
    {
        $seller = $this->seller(function (Store $store) {
            $store->update(['status' => 'suspended']);
        });

        Sanctum::actingAs($seller, ['seller']);

        // These two are the only calls the reinstatement screen makes, so they
        // must keep working or the seller cannot recover.
        $this->getJson('/api/seller/store')->assertOk();
        $this->getJson('/api/seller/store/reinstatement-requests')->assertOk();
    }

    public function test_non_seller_account_is_refused_without_the_suspension_code(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        Sanctum::actingAs($buyer, ['buyer']);

        $this->getJson('/api/seller/store/dashboard')
            ->assertStatus(403)
            ->assertJsonMissingPath('errors.code');
    }
}