<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class SupportMessage extends Model
{
    protected $fillable = ['support_ticket_id','sender_id','sender_role','body','attachment_path','attachment_type','attachment_name','is_internal'];
    protected $casts = ['is_internal' => 'boolean'];
    protected $appends = ['attachment_url'];
    public function ticket(): BelongsTo { return $this->belongsTo(SupportTicket::class, 'support_ticket_id'); }
    public function sender(): BelongsTo { return $this->belongsTo(User::class, 'sender_id'); }
    public function getAttachmentUrlAttribute(): ?string { return $this->attachment_path ? Storage::disk('public')->url($this->attachment_path) : null; }
}
