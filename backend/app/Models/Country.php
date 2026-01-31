<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'phone_code',
        'currency_code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get all states for this country
     */
    public function states(): HasMany
    {
        return $this->hasMany(State::class);
    }

    /**
     * Get active states only
     */
    public function activeStates(): HasMany
    {
        return $this->hasMany(State::class)->where('is_active', true);
    }
}
