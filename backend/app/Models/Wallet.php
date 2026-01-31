<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wallet extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'shopping_balance',
        'reward_balance',
        'referral_balance',
        'loyality_points',
        'ad_credit',
    ];

    protected $casts = [
        'shopping_balance' => 'decimal:2',
        'reward_balance' => 'decimal:2',
        'referral_balance' => 'decimal:2',
        'loyality_points' => 'decimal:2',
        'ad_credit' => 'decimal:2',
    ];

    /**
     * Get the user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

