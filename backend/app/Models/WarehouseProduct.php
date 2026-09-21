<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class WarehouseProduct extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'warehouse_category_id', 'name', 'sku', 'description', 'image_path', 'price', 'shipping_fee', 'stock_quantity',
        'low_stock_threshold', 'color', 'temple_size', 'lens_size', 'bridge_size', 'details', 'is_active',
    ];
    protected $casts = ['price' => 'decimal:2', 'shipping_fee' => 'decimal:2', 'details' => 'array', 'is_active' => 'boolean'];
    protected $appends = ['image_url', 'availability'];

    public function category(): BelongsTo { return $this->belongsTo(WarehouseCategory::class, 'warehouse_category_id'); }
    public function getImageUrlAttribute(): ?string { return $this->image_path ? Storage::url($this->image_path) : null; }
    public function getAvailabilityAttribute(): string
    {
        if (! $this->is_active || $this->stock_quantity === 0) return 'out_of_stock';
        if ($this->stock_quantity <= $this->low_stock_threshold) return 'low_stock';
        return 'in_stock';
    }
}
