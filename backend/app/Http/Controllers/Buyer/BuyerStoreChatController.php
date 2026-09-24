<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Store\StoreChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BuyerStoreChatController extends Controller
{
    public function __construct(
        private StoreChatService $storeChatService
    ) {}

    public function index(Request $request): JsonResponse
    {
        try {
            $conversations = $this->storeChatService->listBuyerConversations(
                $request->user(),
                min(100, max(1, (int) $request->integer('per_page', 30))),
            );
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage(), null, 403);
        }

        return ResponseHelper::success([
            'conversations' => $conversations->getCollection()->map(fn ($conversation) => $this->serializeConversation($conversation)),
            'pagination' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function show(int $storeId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isBuyer()) {
            return ResponseHelper::error('Only buyer accounts can use store chat.', null, 403);
        }

        try {
            $payload = $this->storeChatService->buyerChatPayload($user, $storeId);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Store not found.', null, 404);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        return ResponseHelper::success([
            'conversation' => $this->serializeConversation($payload['conversation']),
            'messages' => $payload['messages']->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function messages(int $storeId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isBuyer()) {
            return ResponseHelper::error('Only buyer accounts can use store chat.', null, 403);
        }

        $afterId = $request->query('after_id');
        $afterId = $afterId !== null && $afterId !== '' ? (int) $afterId : null;

        try {
            $conversation = $this->storeChatService->getOrCreateConversation($user, $storeId);
            $messages = $this->storeChatService->recentMessages($conversation, $afterId, 100);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Store not found.', null, 404);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        return ResponseHelper::success([
            'messages' => $messages->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function storeMessage(int $storeId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isBuyer()) {
            return ResponseHelper::error('Only buyer accounts can use store chat.', null, 403);
        }

        try {
            $request->validate([
                'body' => ['nullable', 'string', 'max:5000'],
                'attachment' => ['nullable', 'file', 'max:5120', 'mimes:jpg,jpeg,png,gif,webp,pdf'],
            ]);
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        }

        try {
            $message = $this->storeChatService->sendBuyerMessage(
                $user,
                $storeId,
                (string) $request->input('body', ''),
                $request->file('attachment')
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Store not found.', null, 404);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        return ResponseHelper::success([
            'message' => $this->serializeMessage($message),
        ], 'Message sent', 201);
    }

    private function serializeConversation(\App\Models\StoreChatConversation $c): array
    {
        return [
            'id' => $c->id,
            'store_id' => $c->store_id,
            'buyer_unread_count' => $c->buyer_unread_count,
            'seller_unread_count' => $c->seller_unread_count,
            'last_message_at' => $c->last_message_at?->toIso8601String(),
            'last_message_preview' => $c->last_message_preview,
            'store' => $c->relationLoaded('store') && $c->store ? [
                'id' => $c->store->id,
                'name' => $c->store->name,
                'slug' => $c->store->slug,
                'profile_image' => $c->store->profile_image,
                'profile_image_url' => $c->store->profile_image_url,
            ] : null,
        ];
    }

    private function serializeMessage(\App\Models\StoreChatMessage $m): array
    {
        return [
            'id' => $m->id,
            'store_chat_conversation_id' => $m->store_chat_conversation_id,
            'sender_id' => $m->sender_id,
            'body' => $m->body,
            'attachment_path' => $m->attachment_path,
            'attachment_type' => $m->attachment_type,
            'attachment_name' => $m->attachment_name,
            'attachment_url' => $m->attachment_url,
            'created_at' => $m->created_at?->toIso8601String(),
            'sender' => $m->relationLoaded('sender') && $m->sender
                ? ['id' => $m->sender->id, 'name' => $m->sender->name]
                : null,
        ];
    }
}
