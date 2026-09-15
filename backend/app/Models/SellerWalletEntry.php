<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SellerWalletEntry extends Model
{
    protected $guarded = [];

    protected $casts = ['amount' => 'decimal:2', 'deltas' => 'array', 'balances_after' => 'array'];
}
