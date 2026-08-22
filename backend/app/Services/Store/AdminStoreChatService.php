<?php

namespace App\Services\Store;

use App\Models\AdminStoreChatConversation;
use App\Models\AdminStoreChatMessage;
use App\Models\Store;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminStoreChatService
{
    public function __construct(
        private StoreChatService $storeChatService
    ) {}

    public function getOrCreateForStore(Store $store): AdminStoreChatConversation
    {
        return AdminStoreChatConversation::firstOrCreate(
            ['store_id' => $store->id],
            [
                'admin_unread_count' => 0,
                'seller_unread_count' => 0,
            ]
        );
    }

    public function getOrCreateForSeller(User $seller): AdminStoreChatConversation
    {
        $store = $this->storeChatService->getSellerStore($seller);

        return $this->getOrCreateForStore($store);
    }

    /**
     * @return LengthAwarePaginator<int, AdminStoreChatConversation>
     */
    public function listForAdmin(int $perPage = 20): LengthAwarePaginator
    {
        return AdminStoreChatConversation::query()
            ->with(['store:id,name,user_id'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id')
            ->paginate($perPage);
    }

    public function findForAdmin(int $conversationId): AdminStoreChatConversation
    {
        return AdminStoreChatConversation::query()
            ->with(['store:id,name,user_id'])
            ->findOrFail($conversationId);
    }

    /**
     * @return Collection<int, AdminStoreChatMessage>
     */
    public function recentMessages(AdminStoreChatConversation $conversation, ?int $afterId = null, int $limit = 100): Collection
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

    public function markAdminRead(AdminStoreChatConversation $conversation): void
    {
        if ($conversation->admin_unread_count > 0) {
            $conversation->update(['admin_unread_count' => 0]);
        }
    }

    public function markSellerRead(AdminStoreChatConversation $conversation): void
    {
        if ($conversation->seller_unread_count > 0) {
            $conversation->update(['seller_unread_count' => 0]);
        }
    }

    public function sendFromSeller(User $seller, string $body, ?UploadedFile $attachment = null): AdminStoreChatMessage
    {
        $conversation = $this->getOrCreateForSeller($seller);
        $body = trim($body);
        $attachmentMeta = $this->storeChatService->storeAttachment(
            $attachment,
            "chat/admin-store/{$conversation->store_id}/seller"
        );

        if ($body === '' && !$attachmentMeta) {
            throw new \InvalidArgumentException('Message body or attachment is required.');
        }

        return DB::transaction(function () use ($conversation, $seller, $body, $attachmentMeta) {
            $message = AdminStoreChatMessage::create([
                'admin_store_chat_conversation_id' => $conversation->id,
                'sender_id' => $seller->id,
                'sender_role' => 'seller',
                'body' => $body !== '' ? $body : ($attachmentMeta ? '[Attachment]' : ''),
                'attachment_path' => $attachmentMeta['path'] ?? null,
                'attachment_type' => $attachmentMeta['type'] ?? null,
                'attachment_name' => $attachmentMeta['name'] ?? null,
            ]);

            $previewSource = $body !== '' ? $body : ('📎 '.($attachmentMeta['name'] ?? 'Attachment'));
            $conversation->update([
                'last_message_at' => $message->created_at,
                'last_message_preview' => Str::limit(preg_replace('/\s+/', ' ', trim(strip_tags($previewSource))) ?: 'Message', 200),
            ]);
            $conversation->increment('admin_unread_count');

            return $message->load('sender:id,name');
        });
    }

    public function sendFromAdmin(User $admin, int $conversationId, string $body, ?UploadedFile $attachment = null): AdminStoreChatMessage
    {
        if (!$admin->isAdmin()) {
            throw new \InvalidArgumentException('Only admins can reply here.');
        }

        $conversation = $this->findForAdmin($conversationId);
        $body = trim($body);
        $attachmentMeta = $this->storeChatService->storeAttachment(
            $attachment,
            "chat/admin-store/{$conversation->store_id}/admin"
        );

        if ($body === '' && !$attachmentMeta) {
            throw new \InvalidArgumentException('Message body or attachment is required.');
        }

        return DB::transaction(function () use ($conversation, $admin, $body, $attachmentMeta) {
            $message = AdminStoreChatMessage::create([
                'admin_store_chat_conversation_id' => $conversation->id,
                'sender_id' => $admin->id,
                'sender_role' => 'admin',
                'body' => $body !== '' ? $body : ($attachmentMeta ? '[Attachment]' : ''),
                'attachment_path' => $attachmentMeta['path'] ?? null,
                'attachment_type' => $attachmentMeta['type'] ?? null,
                'attachment_name' => $attachmentMeta['name'] ?? null,
            ]);

            $previewSource = $body !== '' ? $body : ('📎 '.($attachmentMeta['name'] ?? 'Attachment'));
            $conversation->update([
                'last_message_at' => $message->created_at,
                'last_message_preview' => Str::limit(preg_replace('/\s+/', ' ', trim(strip_tags($previewSource))) ?: 'Message', 200),
            ]);
            $conversation->increment('seller_unread_count');

            return $message->load('sender:id,name');
        });
    }

    /**
     * @return array{conversation: AdminStoreChatConversation, messages: Collection<int, AdminStoreChatMessage>}
     */
    public function sellerPayload(User $seller, ?int $afterId = null): array
    {
        $conversation = $this->getOrCreateForSeller($seller);
        if ($afterId === null) {
            $this->markSellerRead($conversation);
            $conversation->refresh();
        }
        $conversation->load('store:id,name');

        return [
            'conversation' => $conversation,
            'messages' => $this->recentMessages($conversation, $afterId, $afterId === null ? 100 : 200),
        ];
    }

    /**
     * @return array{conversation: AdminStoreChatConversation, messages: Collection<int, AdminStoreChatMessage>}
     */
    public function adminPayload(int $conversationId, ?int $afterId = null): array
    {
        $conversation = $this->findForAdmin($conversationId);
        if ($afterId === null) {
            $this->markAdminRead($conversation);
            $conversation->refresh();
        }

        return [
            'conversation' => $conversation,
            'messages' => $this->recentMessages($conversation, $afterId, $afterId === null ? 100 : 200),
        ];
    }
}
