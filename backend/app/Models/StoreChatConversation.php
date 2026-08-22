<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreChatConversation extends Model
{
    protected $fillable = [
        'store_id',
        'buyer_id',
        'buyer_unread_count',
        'seller_unread_count',
        'last_message_at',
        'last_message_preview',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'buyer_unread_count' => 'integer',
            'seller_unread_count' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(StoreChatMessage::class, 'store_chat_conversation_id');
    }
}
