<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreFollower extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'user_id',
    ];

    /**
     * Get the store that is being followed.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the user that is following.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
