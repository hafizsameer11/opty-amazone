<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralReward extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'reward_value' => 'decimal:2', 'eligible_subtotal' => 'decimal:2', 'amount' => 'decimal:2',
        'qualifies_at' => 'datetime', 'qualified_at' => 'datetime', 'rewarded_at' => 'datetime', 'rejected_at' => 'datetime',
        'suspended_at' => 'datetime', 'reversed_at' => 'datetime', 'risk_flags' => 'array', 'terms_snapshot' => 'array',
    ];

    protected static function booted(): void
    {
        static::updated(function (self $reward): void {
            if (! $reward->wasChanged('status')) {
                return;
            }

            $reward->loadMissing(['referrer', 'campaign.store.user']);
            $status = (string) $reward->status;
            $labels = [
                'qualified' => ['Referral reward qualified', 'Your referral reward is being processed.'],
                'rewarded' => ['Referral reward received', 'Your referral reward has been credited to your wallet.'],
                'rejected' => ['Referral reward rejected', 'A referral reward was rejected.'],
                'suspended' => ['Referral reward paused', 'A referral reward needs verification before it can be paid.'],
                'reversed' => ['Referral reward reversed', 'A referral reward was reversed.'],
            ];
            if (! isset($labels[$status])) {
                return;
            }

            [$title, $message] = $labels[$status];
            app(\App\Services\Notifications\MarketplaceNotificationService::class)->send(
                $reward->referrer,
                'referral.'.$status,
                $title,
                $message,
                '/profile?tab=referrals',
                ['reward_id' => $reward->id, 'status' => $status, 'amount' => (float) $reward->amount]
            );
        });
    }

    public function conversion() { return $this->belongsTo(ReferralConversion::class, 'referral_conversion_id'); }
    public function attribution() { return $this->belongsTo(ReferralAttribution::class, 'referral_attribution_id'); }
    public function campaign() { return $this->belongsTo(ReferralCampaign::class, 'referral_campaign_id'); }
    public function referrer() { return $this->belongsTo(User::class, 'referrer_user_id'); }
    public function referred() { return $this->belongsTo(User::class, 'referred_user_id'); }
    public function order() { return $this->belongsTo(Order::class); }
    public function storeOrder() { return $this->belongsTo(StoreOrder::class); }
    public function buyerTransaction() { return $this->belongsTo(Transaction::class, 'buyer_transaction_id'); }
    public function sellerWalletEntry() { return $this->belongsTo(SellerWalletEntry::class); }
    public function platformLedgerEntry() { return $this->belongsTo(PlatformLedgerEntry::class); }
    public function reversal() { return $this->hasOne(ReferralRewardReversal::class); }
}
