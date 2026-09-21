<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarehouseOrderItem extends Model
{
    protected $fillable = ['warehouse_order_id', 'warehouse_product_id', 'product_name', 'sku', 'image_path', 'unit_price', 'quantity', 'line_total', 'product_snapshot'];
    protected $casts = ['unit_price' => 'decimal:2', 'line_total' => 'decimal:2', 'product_snapshot' => 'array'];
    public function order(): BelongsTo { return $this->belongsTo(WarehouseOrder::class, 'warehouse_order_id'); }
    public function product(): BelongsTo { return $this->belongsTo(WarehouseProduct::class, 'warehouse_product_id')->withTrashed(); }
}
