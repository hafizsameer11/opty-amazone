<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\StoreChatConversation;
use App\Models\StoreChatMessage;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StoreChatService
{
    public function resolveActiveStore(int $storeId): Store
    {
        return Store::where('is_active', true)->findOrFail($storeId);
    }

    public function getOrCreateConversation(User $buyer, int $storeId): StoreChatConversation
    {
        $store = $this->resolveActiveStore($storeId);

        if ((int) $store->user_id === (int) $buyer->id) {
            throw new \InvalidArgumentException('You cannot message your own store.');
        }

        return StoreChatConversation::firstOrCreate(
            [
                'store_id' => $store->id,
                'buyer_id' => $buyer->id,
            ],
            [
                'buyer_unread_count' => 0,
                'seller_unread_count' => 0,
            ]
        );
    }

    public function markBuyerRead(StoreChatConversation $conversation): void
    {
        if ($conversation->buyer_unread_count > 0) {
            $conversation->update(['buyer_unread_count' => 0]);
        }
    }

    public function markSellerRead(StoreChatConversation $conversation): void
    {
        if ($conversation->seller_unread_count > 0) {
            $conversation->update(['seller_unread_count' => 0]);
        }
    }

    /**
     * @return Collection<int, StoreChatMessage>
     */
    public function recentMessages(StoreChatConversation $conversation, ?int $afterId = null, int $limit = 100): Collection
    {
        if ($afterId !== null) {
            return $conversation->messages()
                ->with('sender:id,name')
                ->where('id', '>', $afterId)
                ->orderBy('id')
                ->limit(200)
                ->get();
        }

        return $conversation->messages()
            ->with('sender:id,name')
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->sortBy('id')
            ->values();
    }

    /**
     * @return array{path: string, type: string, name: string}|null
     */
    public function storeAttachment(?UploadedFile $file, string $folder): ?array
    {
        if (!$file) {
            return null;
        }

        $mime = $file->getMimeType() ?: '';
        $isImage = str_starts_with($mime, 'image/');
        $isPdf = $mime === 'application/pdf' || strtolower($file->getClientOriginalExtension()) === 'pdf';

        if (!$isImage && !$isPdf) {
            throw new \InvalidArgumentException('Attachment must be an image or PDF.');
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            throw new \InvalidArgumentException('Attachment must be 5MB or smaller.');
        }

        $path = $file->store($folder, 'public');

        return [
            'path' => $path,
            'type' => $isImage ? 'image' : 'file',
            'name' => $file->getClientOriginalName(),
        ];
    }

    public function sendBuyerMessage(User $buyer, int $storeId, string $body, ?UploadedFile $attachment = null): StoreChatMessage
    {
        if (!$buyer->isBuyer()) {
            throw new \InvalidArgumentException('Only buyers can use store chat.');
        }

        $body = trim($body);
        $attachmentMeta = $this->storeAttachment($attachment, "chat/stores/{$storeId}/buyer-{$buyer->id}");

        if ($body === '' && !$attachmentMeta) {
            throw new \InvalidArgumentException('Message body or attachment is required.');
        }

        $conversation = $this->getOrCreateConversation($buyer, $storeId);

        return DB::transaction(function () use ($conversation, $buyer, $body, $attachmentMeta) {
            $message = StoreChatMessage::create([
                'store_chat_conversation_id' => $conversation->id,
                'sender_id' => $buyer->id,
                'body' => $body !== '' ? $body : ($attachmentMeta ? '[Attachment]' : ''),
                'attachment_path' => $attachmentMeta['path'] ?? null,
                'attachment_type' => $attachmentMeta['type'] ?? null,
                'attachment_name' => $attachmentMeta['name'] ?? null,
            ]);

            $previewSource = $body !== ''
                ? $body
                : ('📎 '.($attachmentMeta['name'] ?? 'Attachment'));
            $preview = Str::limit(preg_replace('/\s+/', ' ', trim(strip_tags($previewSource))) ?: 'Message', 200);

            $conversation->update([
                'last_message_at' => $message->created_at,
                'last_message_preview' => $preview,
            ]);
            $conversation->increment('seller_unread_count');

            return $message->load('sender:id,name');
        });
    }

    public function getSellerStore(User $seller): Store
    {
        if (!$seller->isSeller()) {
            throw new \InvalidArgumentException('Only sellers can access seller chat.');
        }

        $store = $seller->store;
        if (!$store) {
            throw new \InvalidArgumentException('No store found for this account.');
        }

        return $store;
    }

    /**
     * @return LengthAwarePaginator<int, StoreChatConversation>
     */
    public function listSellerConversations(User $seller, int $perPage = 20): LengthAwarePaginator
    {
        $store = $this->getSellerStore($seller);

        return StoreChatConversation::query()
            ->where('store_id', $store->id)
            ->with(['buyer:id,name,email'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function findConversationForSeller(User $seller, int $conversationId): StoreChatConversation
    {
        $store = $this->getSellerStore($seller);

        return StoreChatConversation::query()
            ->where('store_id', $store->id)
            ->where('id', $conversationId)
            ->with(['buyer:id,name,email'])
            ->firstOrFail();
    }

    public function sendSellerMessage(User $seller, int $conversationId, string $body, ?UploadedFile $attachment = null): StoreChatMessage
    {
        $conversation = $this->findConversationForSeller($seller, $conversationId);
        $body = trim($body);
        $attachmentMeta = $this->storeAttachment(
            $attachment,
            "chat/stores/{$conversation->store_id}/seller-{$seller->id}"
        );

        if ($body === '' && !$attachmentMeta) {
            throw new \InvalidArgumentException('Message body or attachment is required.');
        }

        return DB::transaction(function () use ($conversation, $seller, $body, $attachmentMeta) {
            $message = StoreChatMessage::create([
                'store_chat_conversation_id' => $conversation->id,
                'sender_id' => $seller->id,
                'body' => $body !== '' ? $body : ($attachmentMeta ? '[Attachment]' : ''),
                'attachment_path' => $attachmentMeta['path'] ?? null,
                'attachment_type' => $attachmentMeta['type'] ?? null,
                'attachment_name' => $attachmentMeta['name'] ?? null,
            ]);

            $previewSource = $body !== ''
                ? $body
                : ('📎 '.($attachmentMeta['name'] ?? 'Attachment'));
            $preview = Str::limit(preg_replace('/\s+/', ' ', trim(strip_tags($previewSource))) ?: 'Message', 200);

            $conversation->update([
                'last_message_at' => $message->created_at,
                'last_message_preview' => $preview,
            ]);
            $conversation->increment('buyer_unread_count');

            return $message->load('sender:id,name');
        });
    }

    /**
     * @return array{conversation: StoreChatConversation, messages: Collection<int, StoreChatMessage>}
     */
    public function buyerChatPayload(User $buyer, int $storeId): array
    {
        $conversation = $this->getOrCreateConversation($buyer, $storeId);
        $this->markBuyerRead($conversation);
        $conversation->refresh();

        $messages = $this->recentMessages($conversation, null, 100);

        return [
            'conversation' => $conversation,
            'messages' => $messages,
        ];
    }

    /**
     * @return array{conversation: StoreChatConversation, messages: Collection<int, StoreChatMessage>}
     */
    public function sellerConversationPayload(User $seller, int $conversationId, ?int $afterId = null): array
    {
        $conversation = $this->findConversationForSeller($seller, $conversationId);
        if ($afterId === null) {
            $this->markSellerRead($conversation);
            $conversation->refresh();
        }

        $messages = $this->recentMessages($conversation, $afterId, $afterId === null ? 100 : 200);

        return [
            'conversation' => $conversation,
            'messages' => $messages,
        ];
    }
}
