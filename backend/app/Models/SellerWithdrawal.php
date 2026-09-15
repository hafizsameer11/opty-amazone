<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerWithdrawal extends Model
{
    protected $guarded = [];

    protected $casts = ['amount' => 'decimal:2', 'bank_details' => 'encrypted:array', 'completed_at' => 'datetime'];

    public function wallet()
    {
        return $this->belongsTo(SellerWallet::class, 'seller_wallet_id');
    }
}
