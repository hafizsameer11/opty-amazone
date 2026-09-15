<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerWallet extends Model
{
    protected $guarded = [];

    protected $casts = ['available_balance' => 'decimal:2', 'pending_balance' => 'decimal:2', 'reserved_balance' => 'decimal:2', 'disputed_balance' => 'decimal:2', 'debt_balance' => 'decimal:2', 'total_earnings' => 'decimal:2'];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function entries()
    {
        return $this->hasMany(SellerWalletEntry::class);
    }

    public function withdrawals()
    {
        return $this->hasMany(SellerWithdrawal::class);
    }
}
