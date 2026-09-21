<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WarehouseCart extends Model
{
    protected $fillable = ['seller_id'];
    public function seller(): BelongsTo { return $this->belongsTo(User::class, 'seller_id'); }
    public function items(): HasMany { return $this->hasMany(WarehouseCartItem::class); }
}
