<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MarketplacePayment extends Model
{
    protected $guarded = [];

    protected $casts = ['amount' => 'decimal:2'];

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }

    public function refundTransaction()
    {
        return $this->belongsTo(Transaction::class, 'refund_transaction_id');
    }
}
