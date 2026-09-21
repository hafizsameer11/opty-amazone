<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class WarehouseCategory extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPES = ['eyeglasses', 'contact_lenses', 'contact_lens_solutions'];

    protected $fillable = ['name', 'slug', 'type', 'description', 'is_active', 'sort_order'];
    protected $casts = ['is_active' => 'boolean'];

    public function products(): HasMany { return $this->hasMany(WarehouseProduct::class); }
}
