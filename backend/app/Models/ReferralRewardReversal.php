<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralRewardReversal extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['amount' => 'decimal:2', 'metadata' => 'array'];

    public function reward() { return $this->belongsTo(ReferralReward::class); }
    public function actor() { return $this->belongsTo(User::class, 'actor_id'); }
    public function buyerTransaction() { return $this->belongsTo(Transaction::class, 'buyer_transaction_id'); }
    public function sellerWalletEntry() { return $this->belongsTo(SellerWalletEntry::class); }
    public function platformLedgerEntry() { return $this->belongsTo(PlatformLedgerEntry::class); }
}
