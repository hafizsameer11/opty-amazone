<?php

namespace Tests\Feature\Referrals;

use App\Models\Order;
use App\Models\PlatformLedgerEntry;
use App\Models\ReferralCampaign;
use App\Models\ReferralConversion;
use App\Models\ReferralReward;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Referrals\ReferralService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ReferralServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_buyer_receives_one_permanent_platform_code(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $service = app(ReferralService::class);

        $first = $service->ensureBuyerCode($buyer);
        $second = $service->ensureBuyerCode($buyer);

        $this->assertSame($first->id, $second->id);
        $this->assertMatchesRegularExpression('/^BUYER/', $first->code);
        $this->assertDatabaseCount('referral_codes', 1);
    }

    public function test_buyer_referral_dashboard_is_available_after_the_referral_schema_is_migrated(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->actingAs($buyer, 'sanctum')->getJson('/api/buyer/referrals')
            ->assertOk()
            ->assertJsonPath('data.platform.code', $buyer->referralCode()->firstOrFail()->code);
    }

    public function test_new_registration_becomes_permanently_attributed_but_existing_buyer_does_not(): void
    {
        $referrer = User::factory()->create(['role' => 'buyer']);
        $code = $referrer->referralCode()->firstOrFail();
        $service = app(ReferralService::class);
        $visit = $service->createAttribution($code->code, null, null, null, '203.0.113.10', 'Referral test device');
        $newBuyer = User::factory()->create(['role' => 'buyer']);

        $conversion = $service->recordRegistration($newBuyer, $visit['token'], null);

        $this->assertNotNull($conversion);
        $this->assertSame($referrer->id, $conversion->referrer_user_id);
        $this->assertDatabaseHas('referral_conversions', ['referred_user_id' => $newBuyer->id]);
        // Claiming a seller-link visit later never creates a second platform conversion.
        $existingVisit = $service->createAttribution($code->code, null, null, null, '203.0.113.11', 'Other device');
        $service->claimAttribution($newBuyer, $existingVisit['token']);
        $this->assertSame(1, ReferralConversion::where('referred_user_id', $newBuyer->id)->count());
    }

    public function test_self_referral_is_rejected(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $code = $buyer->referralCode()->firstOrFail();

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        app(ReferralService::class)->createAttribution($code->code, null, null, $buyer, '203.0.113.12', 'Self referral');
    }

    public function test_admin_approval_respects_immediate_and_scheduled_campaign_activation(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);
        $store = Store::create(['user_id' => $seller->id, 'name' => 'Scheduled Optics', 'slug' => 'scheduled-optics', 'status' => 'active', 'is_active' => true]);
        $service = app(ReferralService::class);

        $scheduled = $this->pendingCampaign($seller, $store, [
            'identifier' => 'REF-SCHEDULED-1', 'activation_mode' => 'scheduled', 'starts_at' => now()->addHour(),
        ]);
        $service->setCampaignStatus($scheduled, $admin, 'approve');
        $this->assertSame('scheduled', $scheduled->fresh()->status);

        $scheduled->update(['starts_at' => now()->subMinute()]);
        $this->assertSame(1, $service->activateDueCampaigns());
        $this->assertSame('active', $scheduled->fresh()->status);

        $immediate = $this->pendingCampaign($seller, $store, [
            'identifier' => 'REF-IMMEDIATE-1', 'activation_mode' => 'immediate', 'starts_at' => now()->addDay(),
        ]);
        $approvalStartedAt = now();
        $service->setCampaignStatus($immediate, $admin, 'approve');
        $immediate->refresh();
        $this->assertSame('active', $immediate->status);
        $this->assertTrue($immediate->starts_at->gte($approvalStartedAt->copy()->startOfSecond()));
        $this->assertTrue($immediate->starts_at->lte(now()));

        $buyer = User::factory()->create(['role' => 'buyer']);
        $this->assertTrue($service->buyerDashboard($buyer)['campaigns']->contains('id', $immediate->id));
    }

    public function test_platform_reward_uses_existing_buyer_wallet_transaction_and_immutable_platform_ledger(): void
    {
        $referrer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        $referred = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        Wallet::create(['user_id' => $referrer->id, 'shopping_balance' => '0.00']);
        $seller = User::factory()->create(['role' => 'seller']);
        $store = Store::create(['user_id' => $seller->id, 'name' => 'Referral Optics', 'slug' => 'referral-optics', 'status' => 'active', 'is_active' => true]);
        $order = Order::create(['user_id' => $referred->id, 'order_no' => 'REF-TEST-1', 'payment_status' => 'paid', 'items_total' => 100, 'shipping_total' => 0, 'platform_fee' => 0, 'discount_total' => 0, 'grand_total' => 100]);
        $shipment = StoreOrder::create(['order_id' => $order->id, 'store_id' => $store->id, 'status' => 'delivered', 'payment_status' => 'paid', 'financial_version' => 1, 'subtotal' => 100, 'delivery_fee' => 0, 'total' => 100, 'delivered_at' => now()]);
        $reward = ReferralReward::create([
            'idempotency_key' => 'test-platform-reward-1', 'source' => 'platform', 'status' => 'pending',
            'referrer_user_id' => $referrer->id, 'referred_user_id' => $referred->id, 'order_id' => $order->id,
            'reward_type' => 'fixed', 'reward_value' => 10, 'eligible_subtotal' => 100, 'eligible_quantity' => 1,
            'amount' => 10, 'qualifies_at' => now()->subMinute(), 'terms_snapshot' => ['test' => true],
        ]);

        app(ReferralService::class)->qualifyDueRewards();

        $reward->refresh();
        $this->assertSame('rewarded', $reward->status);
        $this->assertSame('10.00', $referrer->wallet()->firstOrFail()->fresh()->shopping_balance);
        $this->assertDatabaseHas('transactions', ['id' => $reward->buyer_transaction_id, 'type' => 'referral_reward', 'amount' => '10.00']);
        $this->assertDatabaseHas('platform_ledger_entries', ['id' => $reward->platform_ledger_entry_id, 'type' => 'platform_referral_reward', 'amount' => '-10.00']);
        $this->assertSame(1, Transaction::where('payment_reference', 'referral-reward:'.$reward->id.':buyer')->count());
        $this->assertSame(1, PlatformLedgerEntry::where('reference', 'referral-reward:'.$reward->id.':platform')->count());
        $this->assertNotNull($shipment->fresh());
    }

    public function test_paid_reward_reversal_creates_compensating_transactions_without_deleting_history(): void
    {
        $referrer = User::factory()->create(['role' => 'buyer']);
        Wallet::updateOrCreate(['user_id' => $referrer->id], ['shopping_balance' => '15.00']);
        $this->assertSame('15.00', $referrer->wallet()->firstOrFail()->fresh()->shopping_balance);
        $referred = User::factory()->create(['role' => 'buyer']);
        $order = Order::create(['user_id' => $referred->id, 'order_no' => 'REF-TEST-2', 'payment_status' => 'paid', 'items_total' => 10, 'shipping_total' => 0, 'platform_fee' => 0, 'discount_total' => 0, 'grand_total' => 10]);
        $reward = ReferralReward::create(['idempotency_key' => 'test-platform-reversal-1', 'source' => 'platform', 'status' => 'rewarded',
            'referrer_user_id' => $referrer->id, 'referred_user_id' => $referred->id, 'order_id' => $order->id,
            'reward_type' => 'fixed', 'reward_value' => 10, 'eligible_subtotal' => 10, 'eligible_quantity' => 1, 'amount' => 10,
            'rewarded_at' => now()]);
        $funding = DB::transaction(fn () => app(\App\Services\Marketplace\BuyerWalletService::class)->change(
            $referrer, 1000, 'referral-reward:'.$reward->id.':buyer', 'referral_reward', ['referral_reward_id' => $reward->id]
        ));
        $ledger = PlatformLedgerEntry::create(['reference' => 'referral-reward:'.$reward->id.':platform', 'type' => 'platform_referral_reward', 'amount' => '-10.00']);
        $reward->update(['buyer_transaction_id' => $funding->id, 'platform_ledger_entry_id' => $ledger->id]);

        $reversal = app(ReferralService::class)->reverseReward($reward, null, 'Refunded order', 'test-reversal-key');

        $this->assertSame('reversed', $reward->fresh()->status);
        $this->assertSame(['-10.00', '10.00'], Transaction::where('user_id', $referrer->id)->whereIn('type', ['referral_reward', 'referral_reward_reversal'])->orderBy('amount')->pluck('amount')->all());
        $this->assertSame('15.00', $referrer->wallet()->firstOrFail()->fresh()->shopping_balance);
        $this->assertDatabaseCount('referral_reward_reversals', 1);
        $this->assertDatabaseHas('transactions', ['id' => $reversal->buyer_transaction_id, 'type' => 'referral_reward_reversal', 'amount' => '-10.00']);
        $this->assertSame(2, Transaction::where('user_id', $referrer->id)->whereIn('type', ['referral_reward', 'referral_reward_reversal'])->count());
    }

    private function pendingCampaign(User $seller, Store $store, array $overrides): ReferralCampaign
    {
        return ReferralCampaign::create(array_merge([
            'store_id' => $store->id, 'seller_id' => $seller->id, 'name' => 'Referral campaign',
            'identifier' => 'REF-'.strtoupper(Str::random(12)), 'scope_type' => 'store',
            'status' => 'pending_approval', 'approval_status' => 'pending', 'activation_mode' => 'immediate',
            'reward_type' => 'fixed', 'reward_amount' => 5, 'budget_amount' => 100,
            'budget_reserved' => 100, 'budget_spent' => 0, 'minimum_order_amount' => 0,
            'minimum_quantity' => 1, 'new_customer_only' => true, 'platform_stacking' => 'exclusive',
            'starts_at' => now(),
        ], $overrides));
    }
}
