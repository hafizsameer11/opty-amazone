<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'admin_id',
        'action',
        'resource_type',
        'resource_id',
        'ip_address',
        'user_agent',
        'success',
        'details',
    ];

    protected $casts = [
        'success' => 'boolean',
        'details' => 'array',
    ];

    /**
     * Get the admin user.
     */
    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}
