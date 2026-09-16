<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralCode extends Model
{
    protected $fillable = ['user_id', 'code', 'is_active'];
    protected $casts = ['is_active' => 'boolean'];

    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
