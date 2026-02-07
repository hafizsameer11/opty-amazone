<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prescription extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'prescription_type',
        'od_sphere',
        'od_cylinder',
        'od_axis',
        'od_add',
        'os_sphere',
        'os_cylinder',
        'os_axis',
        'os_add',
        'pd_binocular',
        'pd_monocular_od',
        'pd_monocular_os',
        'pd_near',
        'ph_od',
        'ph_os',
        'doctor_name',
        'doctor_license',
        'prescription_date',
        'expiry_date',
        'notes',
        'is_active',
        'is_verified',
    ];

    protected $casts = [
        'od_sphere' => 'decimal:2',
        'od_cylinder' => 'decimal:2',
        'od_axis' => 'integer',
        'od_add' => 'decimal:2',
        'os_sphere' => 'decimal:2',
        'os_cylinder' => 'decimal:2',
        'os_axis' => 'integer',
        'os_add' => 'decimal:2',
        'pd_binocular' => 'decimal:2',
        'pd_monocular_od' => 'decimal:2',
        'pd_monocular_os' => 'decimal:2',
        'pd_near' => 'decimal:2',
        'ph_od' => 'decimal:2',
        'ph_os' => 'decimal:2',
        'prescription_date' => 'datetime',
        'expiry_date' => 'datetime',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
    ];

    /**
     * Get the user that owns the prescription.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope a query to only include active prescriptions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include verified prescriptions.
     */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /**
     * Check if prescription is expired.
     */
    public function isExpired(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }
        return $this->expiry_date->isPast();
    }
}

