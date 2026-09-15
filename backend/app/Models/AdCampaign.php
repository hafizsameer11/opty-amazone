<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdCampaign extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'starts_at' => 'datetime', 'ends_at' => 'datetime', 'paid_at' => 'datetime',
        'approved_at' => 'datetime', 'locations' => 'array', 'placements' => 'array',
        'legacy_snapshot' => 'array',
    ];

    public const TERMINAL = ['completed', 'cancelled', 'rejected', 'terminated', 'exhausted', 'invalid'];

    public function product()
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id')->withTrashed();
    }

    public function events()
    {
        return $this->hasMany(AdEvent::class);
    }

    public function transactions()
    {
        return $this->hasMany(AdBudgetTransaction::class);
    }

    public function audits()
    {
        return $this->hasMany(AdAuditLog::class);
    }

    public function metrics()
    {
        return $this->hasMany(AdDailyMetric::class);
    }

    public function sellerWallet()
    {
        return $this->belongsTo(SellerWallet::class);
    }

    public function terminal(): bool
    {
        return in_array($this->status, self::TERMINAL, true);
    }
}
