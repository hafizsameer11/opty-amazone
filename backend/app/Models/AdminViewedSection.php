<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Per-admin "last looked at this section" marker.
 *
 * The admin sidebar badges are derived from row counts, so they never fall
 * back to zero on their own. Recording when an admin actually opened a section
 * lets the live summary report how much has arrived since, which is what drives
 * the unread dot.
 */
class AdminViewedSection extends Model
{
    protected $fillable = ['admin_id', 'section', 'viewed_at'];

    protected function casts(): array
    {
        return ['viewed_at' => 'datetime'];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }
}