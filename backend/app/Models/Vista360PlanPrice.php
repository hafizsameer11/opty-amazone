<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vista360PlanPrice extends Model
{
    protected $guarded = [];

    protected $casts = [
        'amount_cents' => 'integer',
        'duration_months' => 'integer',
        'version' => 'integer',
        'is_active' => 'boolean',
        'available_from' => 'datetime',
        'available_until' => 'datetime',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Vista360Plan::class, 'vista360_plan_id');
    }
}
