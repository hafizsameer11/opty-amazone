<?php

namespace App\Services\Marketplace;

use App\Models\AdCampaign;
use App\Models\PlatformLedgerEntry;
use App\Models\SellerWallet;
use Illuminate\Support\Facades\DB;

class PlatformRevenueService
{
    /** Records earned advertising revenue; reserved campaign money is not revenue. */
    public function adSpend(AdCampaign $campaign, SellerWallet $wallet, int $cents, string $reference): PlatformLedgerEntry
    {
        abort_unless(DB::transactionLevel() > 0, 500);

        return PlatformLedgerEntry::firstOrCreate(
            ['reference' => $reference],
            ['type' => 'boost_ad_spend', 'amount' => Money::decimal($cents), 'seller_wallet_id' => $wallet->id,
                'ad_campaign_id' => $campaign->id, 'description' => "Boost campaign spend: {$campaign->name}",
                'metadata' => ['campaign_name' => $campaign->name, 'campaign_status' => $campaign->status]]
        );
    }
}
