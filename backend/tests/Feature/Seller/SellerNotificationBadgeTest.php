<?php

namespace Tests\Feature\Seller;

use App\Models\Store;
use App\Models\SupportTicket;
use App\Models\User;
use App\Notifications\MarketplaceNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SellerNotificationBadgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_and_support_badges_are_read_aware(): void
    {
        $seller = User::factory()->seller()->create();
        $store = Store::factory()->create(['user_id' => $seller->id]);

        SupportTicket::create([
            'ticket_no' => 'SUP-SELLER-001',
            'user_id' => $seller->id,
            'user_role' => 'seller',
            'store_id' => $store->id,
            'subject' => 'Shipping question',
            'category' => 'shipping',
            'description' => 'I need help with a warehouse shipment.',
            'priority' => 'normal',
            'status' => 'waiting_for_user',
            'user_unread_count' => 2,
        ]);

        $seller->notify(new MarketplaceNotification('order.received', 'New order', 'A buyer placed an order.'));
        $seller->notify(new MarketplaceNotification('wallet.credited', 'Wallet update', 'Funds were added.'));

        Sanctum::actingAs($seller, ['seller']);

        $this->getJson('/api/seller/notifications/unread')
            ->assertOk()
            ->assertJsonPath('data.orders', 1)
            ->assertJsonPath('data.support', 2)
            ->assertJsonPath('data.notifications', 2)
            ->assertJsonPath('data.total', 4);

        $this->postJson('/api/seller/notifications/read-category', ['category' => 'orders'])
            ->assertOk()
            ->assertJsonPath('data.orders', 0)
            ->assertJsonPath('data.support', 2)
            ->assertJsonPath('data.notifications', 1)
            ->assertJsonPath('data.total', 3);
    }
}
