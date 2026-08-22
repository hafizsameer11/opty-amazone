<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Store\StoreChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SellerStoreChatController extends Controller
{
    public function __construct(
        private StoreChatService $storeChatService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only seller accounts can access this.', null, 403);
        }

        try {
            $page = $this->storeChatService->listSellerConversations($user, (int) $request->query('per_page', 20));
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        $items = collect($page->items())->map(function ($c) {
            /** @var \App\Models\StoreChatConversation $c */
            return [
                'id' => $c->id,
                'store_id' => $c->store_id,
                'buyer' => $c->buyer ? [
                    'id' => $c->buyer->id,
                    'name' => $c->buyer->name,
                    'email' => $c->buyer->email,
                ] : null,
                'buyer_unread_count' => $c->buyer_unread_count,
                'seller_unread_count' => $c->seller_unread_count,
                'last_message_at' => $c->last_message_at?->toIso8601String(),
                'last_message_preview' => $c->last_message_preview,
            ];
        });

        return ResponseHelper::success([
            'conversations' => $items,
            'pagination' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function show(int $conversationId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only seller accounts can access this.', null, 403);
        }

        try {
            $payload = $this->storeChatService->sellerConversationPayload($user, $conversationId, null);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Conversation not found.', null, 404);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        $c = $payload['conversation'];

        return ResponseHelper::success([
            'conversation' => [
                'id' => $c->id,
                'store_id' => $c->store_id,
                'buyer' => $c->buyer ? [
                    'id' => $c->buyer->id,
                    'name' => $c->buyer->name,
                    'email' => $c->buyer->email,
                ] : null,
                'buyer_unread_count' => $c->buyer_unread_count,
                'seller_unread_count' => $c->seller_unread_count,
                'last_message_at' => $c->last_message_at?->toIso8601String(),
                'last_message_preview' => $c->last_message_preview,
            ],
            'messages' => $payload['messages']->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function messages(int $conversationId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only seller accounts can access this.', null, 403);
        }

        $afterId = $request->query('after_id');
        $afterId = $afterId !== null && $afterId !== '' ? (int) $afterId : null;

        try {
            $payload = $this->storeChatService->sellerConversationPayload($user, $conversationId, $afterId);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Conversation not found.', null, 404);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        return ResponseHelper::success([
            'messages' => $payload['messages']->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function storeMessage(int $conversationId, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only seller accounts can access this.', null, 403);
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
            $message = $this->storeChatService->sendSellerMessage(
                $user,
                $conversationId,
                (string) $request->input('body', ''),
                $request->file('attachment')
            );
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Conversation not found.', null, 404);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        return ResponseHelper::success([
            'message' => $this->serializeMessage($message),
        ], 'Message sent', 201);
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
