<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Store\AdminStoreChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SellerAdminChatController extends Controller
{
    public function __construct(
        private AdminStoreChatService $adminStoreChatService
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only sellers can contact admin.', null, 403);
        }

        try {
            $payload = $this->adminStoreChatService->sellerPayload($user, null);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        $c = $payload['conversation'];

        return ResponseHelper::success([
            'conversation' => $this->serializeConversation($c),
            'messages' => $payload['messages']->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function messages(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only sellers can contact admin.', null, 403);
        }

        $afterId = $request->query('after_id');
        $afterId = $afterId !== null && $afterId !== '' ? (int) $afterId : null;

        try {
            $payload = $this->adminStoreChatService->sellerPayload($user, $afterId);
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        return ResponseHelper::success([
            'messages' => $payload['messages']->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function storeMessage(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only sellers can contact admin.', null, 403);
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
            $message = $this->adminStoreChatService->sendFromSeller(
                $user,
                (string) $request->input('body', ''),
                $request->file('attachment')
            );
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        }

        return ResponseHelper::success([
            'message' => $this->serializeMessage($message),
        ], 'Message sent', 201);
    }

    private function serializeConversation(\App\Models\AdminStoreChatConversation $c): array
    {
        return [
            'id' => $c->id,
            'store_id' => $c->store_id,
            'store' => $c->relationLoaded('store') && $c->store
                ? ['id' => $c->store->id, 'name' => $c->store->name]
                : null,
            'admin_unread_count' => $c->admin_unread_count,
            'seller_unread_count' => $c->seller_unread_count,
            'last_message_at' => $c->last_message_at?->toIso8601String(),
            'last_message_preview' => $c->last_message_preview,
        ];
    }

    private function serializeMessage(\App\Models\AdminStoreChatMessage $m): array
    {
        return [
            'id' => $m->id,
            'admin_store_chat_conversation_id' => $m->admin_store_chat_conversation_id,
            'sender_id' => $m->sender_id,
            'sender_role' => $m->sender_role,
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
