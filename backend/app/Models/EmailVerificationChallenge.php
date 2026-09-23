<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailVerificationChallenge extends Model
{
    protected $fillable = [
        'user_id', 'purpose', 'code_hash', 'attempts', 'sent_at', 'expires_at', 'verified_at',
    ];

    protected $hidden = ['code_hash'];

    protected $casts = [
        'sent_at' => 'datetime',
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
