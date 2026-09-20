<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponAudit extends Model
{
    use HasFactory;

    protected $fillable = ['coupon_id', 'store_id', 'actor_id', 'action', 'before', 'after', 'context'];
    protected $casts = ['before' => 'array', 'after' => 'array', 'context' => 'array'];

    public function coupon(): BelongsTo { return $this->belongsTo(Coupon::class); }
    public function actor(): BelongsTo { return $this->belongsTo(User::class, 'actor_id'); }
    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
}
