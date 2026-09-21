<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class WarehouseProduct extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'warehouse_category_id', 'name', 'sku', 'description', 'image_path', 'price', 'shipping_fee', 'stock_quantity',
        'low_stock_threshold', 'color', 'temple_size', 'lens_size', 'bridge_size', 'details', 'is_active', 'is_draft',
    ];
    protected $casts = ['price' => 'decimal:2', 'shipping_fee' => 'decimal:2', 'details' => 'array', 'is_active' => 'boolean', 'is_draft' => 'boolean'];
    protected $appends = ['image_url', 'availability'];

    public function category(): BelongsTo { return $this->belongsTo(WarehouseCategory::class, 'warehouse_category_id'); }
    /** Warehouse uploads are written to the public disk, never the default disk. */
    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) return null;
        if (Str::startsWith($this->image_path, ['http://', 'https://'])) return $this->image_path;

        return Storage::disk('public')->url($this->image_path);
    }
    public function getAvailabilityAttribute(): string
    {
        if (! $this->is_active || $this->stock_quantity === 0) return 'out_of_stock';
        if ($this->stock_quantity <= $this->low_stock_threshold) return 'low_stock';
        return 'in_stock';
    }
}
