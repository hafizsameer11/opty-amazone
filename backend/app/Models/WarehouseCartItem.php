<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarehouseCartItem extends Model
{
    protected $fillable = ['warehouse_cart_id', 'warehouse_product_id', 'quantity'];
    public function cart(): BelongsTo { return $this->belongsTo(WarehouseCart::class, 'warehouse_cart_id'); }
    public function product(): BelongsTo { return $this->belongsTo(WarehouseProduct::class, 'warehouse_product_id'); }
}
