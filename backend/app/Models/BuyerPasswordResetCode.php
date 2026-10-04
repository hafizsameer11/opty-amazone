<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuyerPasswordResetCode extends Model
{
    protected $fillable = [
        'user_id', 'email', 'code', 'attempts', 'expires_at',
        'verified_at', 'reset_token', 'reset_token_expires_at',
    ];

    protected $hidden = ['code', 'reset_token'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'reset_token_expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}