<?php

namespace Tests\Feature\Admin;

use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserDeletionTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
        Sanctum::actingAs($this->admin);
    }

    /* ----------------------------------------------------------------- *
     * Sellers are protected
     * ----------------------------------------------------------------- */

    public function test_a_seller_cannot_be_deleted(): void
    {
        $seller = User::factory()->seller()->create();
        $store = Store::factory()->approved()->create(['user_id' => $seller->id]);

        $this->deleteJson("/api/admin/users/{$seller->id}")
            ->assertStatus(422)
            ->assertJsonPath(
                'message',
                'This user is a Seller and has an associated store. '
                .'Seller accounts cannot be deleted from the Users section. '
                .'Manage the Seller/Store from Store Management instead.'
            );

        // The account, store and everything under them stay connected.
        $this->assertDatabaseHas('users', ['id' => $seller->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('stores', ['id' => $store->id, 'user_id' => $seller->id]);
    }

    public function test_a_seller_without_a_store_row_is_still_protected(): void
    {
        // Store provisioning is lazy, so a seller can exist without a store yet.
        $seller = User::factory()->seller()->create();
        $this->assertDatabaseMissing('stores', ['user_id' => $seller->id]);

        $this->deleteJson("/api/admin/users/{$seller->id}")->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $seller->id, 'deleted_at' => null]);
    }

    public function test_a_user_who_owns_a_store_cannot_be_deleted_even_if_their_role_changed(): void
    {
        // Closing the loophole where an admin flips the role to buyer first.
        $seller = User::factory()->seller()->create();
        Store::factory()->approved()->create(['user_id' => $seller->id]);
        $seller->update(['role' => 'buyer']);

        $this->deleteJson("/api/admin/users/{$seller->id}")->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $seller->id, 'deleted_at' => null, 'role' => 'buyer']);
    }

    public function test_the_refusal_includes_the_store_id_so_the_admin_can_jump_there(): void
    {
        $seller = User::factory()->seller()->create();
        $store = Store::factory()->approved()->create(['user_id' => $seller->id]);

        $this->deleteJson("/api/admin/users/{$seller->id}")
            ->assertStatus(422)
            ->assertJsonPath('errors.store_id.0', (string) $store->id);
    }

    public function test_disabling_a_store_still_lets_the_seller_account_remain_intact(): void
    {
        $seller = User::factory()->seller()->create();
        $store = Store::factory()->approved()->create(['user_id' => $seller->id]);

        $this->postJson("/api/admin/sellers/{$store->id}/disable")->assertOk();

        $this->deleteJson("/api/admin/users/{$seller->id}")->assertStatus(422);

        $this->assertDatabaseHas('users', ['id' => $seller->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('stores', [
            'id' => $store->id,
            'user_id' => $seller->id,
            'status' => Store::STATUS_SUSPENDED,
        ]);
    }

    /* ----------------------------------------------------------------- *
     * Buyers keep the existing behaviour
     * ----------------------------------------------------------------- */

    public function test_a_buyer_can_still_be_deleted(): void
    {
        $buyer = User::factory()->create();

        $this->deleteJson("/api/admin/users/{$buyer->id}")->assertOk();

        $this->assertSoftDeleted('users', ['id' => $buyer->id]);
    }

    public function test_a_buyer_keeps_their_order_history_after_deletion(): void
    {
        $buyer = User::factory()->create();
        $orderId = DB::table('orders')->insertGetId([
            'user_id' => $buyer->id, 'order_no' => 'ORD-B1', 'items_total' => 9, 'grand_total' => 9,
        ]);

        $this->deleteJson("/api/admin/users/{$buyer->id}")->assertOk();

        // Deletion is a soft delete, so the order stays attached and auditable.
        $this->assertDatabaseHas('orders', ['id' => $orderId, 'user_id' => $buyer->id]);
    }

    public function test_an_admin_cannot_delete_their_own_account(): void
    {
        $this->deleteJson("/api/admin/users/{$this->admin->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'You cannot delete your own account.');

        $this->assertDatabaseHas('users', ['id' => $this->admin->id, 'deleted_at' => null]);
    }

    public function test_an_admin_can_delete_another_admin_while_one_remains(): void
    {
        $otherAdmin = User::factory()->admin()->create();

        $this->deleteJson("/api/admin/users/{$otherAdmin->id}")->assertOk();

        $this->assertSoftDeleted('users', ['id' => $otherAdmin->id]);
        // The acting admin is untouched and still able to administer.
        $this->assertDatabaseHas('users', ['id' => $this->admin->id, 'deleted_at' => null]);
        $this->getJson('/api/admin/users')->assertOk();
    }

    /* ----------------------------------------------------------------- *
     * Flags exposed to the Users page
     * ----------------------------------------------------------------- */

    public function test_the_list_flags_sellers_as_not_deletable_and_buyers_as_deletable(): void
    {
        $seller = User::factory()->seller()->create();
        $sellerWithStore = User::factory()->seller()->create();
        $store = Store::factory()->approved()->create(['user_id' => $sellerWithStore->id]);
        $buyer = User::factory()->create();

        $rows = collect($this->getJson('/api/admin/users')->assertOk()->json('data.data'))
            ->keyBy('id');

        $this->assertFalse($rows[$seller->id]['can_delete']);
        $this->assertFalse($rows[$sellerWithStore->id]['can_delete']);
        $this->assertTrue($rows[$buyer->id]['can_delete']);
        $this->assertNull($rows[$buyer->id]['delete_blocked_reason']);

        $this->assertStringContainsString('Store Management', $rows[$seller->id]['delete_blocked_reason']);
        $this->assertSame($store->id, $rows[$sellerWithStore->id]['store']['id']);
    }

    public function test_the_role_filtered_list_also_carries_the_flags(): void
    {
        $seller = User::factory()->seller()->create();
        User::factory()->create();

        $rows = $this->getJson('/api/admin/users?role=seller')->assertOk()->json('data.data');

        $this->assertCount(1, $rows);
        $this->assertFalse($rows[0]['can_delete']);
        $this->assertNotEmpty($rows[0]['delete_blocked_reason']);
    }

    public function test_the_user_detail_endpoint_carries_the_flags(): void
    {
        $seller = User::factory()->seller()->create();
        Store::factory()->approved()->create(['user_id' => $seller->id, 'name' => 'Seller Shop']);

        $data = $this->getJson("/api/admin/users/{$seller->id}")->assertOk()->json('data');

        $this->assertFalse($data['can_delete']);
        $this->assertStringContainsString('cannot be deleted from the Users section', $data['delete_blocked_reason']);
        $this->assertSame('Seller Shop', $data['store']['name']);
    }

    /* ----------------------------------------------------------------- *
     * No orphaned store graph
     * ----------------------------------------------------------------- */

    public function test_a_refused_deletion_leaves_the_whole_store_graph_intact(): void
    {
        $seller = User::factory()->seller()->create();
        $store = Store::factory()->approved()->create(['user_id' => $seller->id]);
        $product = Product::factory()->create(['store_id' => $store->id]);

        $buyer = User::factory()->create();
        $orderId = DB::table('orders')->insertGetId([
            'user_id' => $buyer->id, 'order_no' => 'ORD-B2', 'items_total' => 20, 'grand_total' => 20,
        ]);
        $storeOrderId = DB::table('store_orders')->insertGetId([
            'order_id' => $orderId, 'store_id' => $store->id, 'status' => 'delivered',
            'subtotal' => 20, 'total' => 20,
        ]);
        $walletId = DB::table('seller_wallets')->insertGetId(['store_id' => $store->id]);
        DB::table('seller_wallet_entries')->insert([
            'seller_wallet_id' => $walletId, 'reference' => 'ref-usr', 'type' => 'earning',
            'amount' => 20, 'deltas' => '{}', 'balances_after' => '{}',
        ]);

        $this->deleteJson("/api/admin/users/{$seller->id}")->assertStatus(422);

        // Every link in the chain survives.
        $this->assertDatabaseHas('users', ['id' => $seller->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('stores', ['id' => $store->id, 'user_id' => $seller->id]);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'store_id' => $store->id]);
        $this->assertDatabaseHas('store_orders', ['id' => $storeOrderId, 'store_id' => $store->id]);
        $this->assertDatabaseHas('seller_wallet_entries', ['seller_wallet_id' => $walletId]);

        // The seller can still authenticate and manage their store.
        Sanctum::actingAs($seller);
        $this->getJson('/api/seller/store')->assertOk();
    }

    public function test_non_admins_cannot_delete_users(): void
    {
        $buyer = User::factory()->create();
        Sanctum::actingAs(User::factory()->seller()->create());

        $this->deleteJson("/api/admin/users/{$buyer->id}")->assertStatus(403);

        $this->assertDatabaseHas('users', ['id' => $buyer->id, 'deleted_at' => null]);
    }
}