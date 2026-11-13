<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vista360PlanFeature extends Model
{
    protected $guarded = [];

    protected $casts = [
        'value' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Vista360Plan::class, 'vista360_plan_id');
    }
}
