<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SupportTicket extends Model
{
    use HasFactory;
    protected $fillable = ['ticket_no','user_id','user_role','subject','category','description','priority','status','order_id','store_id','product_id','assigned_admin_id','resolved_at','closed_at'];
    protected $casts = ['resolved_at' => 'datetime', 'closed_at' => 'datetime'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function assignedAdmin(): BelongsTo { return $this->belongsTo(User::class, 'assigned_admin_id'); }
    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function messages(): HasMany { return $this->hasMany(SupportMessage::class); }
    public function events(): HasMany { return $this->hasMany(SupportTicketEvent::class); }
}
