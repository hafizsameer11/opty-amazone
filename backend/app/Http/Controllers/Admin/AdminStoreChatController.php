<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\AdminStoreChatConversation;
use App\Models\Store;
use App\Services\Store\AdminStoreChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminStoreChatController extends Controller
{
    public function __construct(
        private AdminStoreChatService $adminStoreChatService
    ) {}

    /**
     * Total unread messages across admin↔seller chats (sidebar badge).
     */
    public function unreadCount(): JsonResponse
    {
        $count = (int) AdminStoreChatConversation::query()->sum('admin_unread_count');

        return ResponseHelper::success([
            'messages' => $count,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return ResponseHelper::error('Only admin accounts can access this.', null, 403);
        }

        $page = $this->adminStoreChatService->listForAdmin((int) $request->query('per_page', 20));

        $items = collect($page->items())->map(fn ($c) => $this->serializeConversation($c));

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

    public function startConversation(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return ResponseHelper::error('Only admin accounts can access this.', null, 403);
        }

        try {
            $request->validate([
                'store_id' => ['required', 'integer', 'exists:stores,id'],
            ]);
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        }

        $store = Store::query()->findOrFail((int) $request->input('store_id'));
        $conversation = $this->adminStoreChatService->getOrCreateForStore($store);
        $conversation->load('store:id,name,user_id');

        return ResponseHelper::success([
            'conversation' => $this->serializeConversation($conversation),
        ], 'Conversation ready', 201);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return ResponseHelper::error('Only admin accounts can access this.', null, 403);
        }

        try {
            $payload = $this->adminStoreChatService->adminPayload($id, null);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Conversation not found.', null, 404);
        }

        return ResponseHelper::success([
            'conversation' => $this->serializeConversation($payload['conversation']),
            'messages' => $payload['messages']->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function messages(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return ResponseHelper::error('Only admin accounts can access this.', null, 403);
        }

        $afterId = $request->query('after_id');
        $afterId = $afterId !== null && $afterId !== '' ? (int) $afterId : null;

        try {
            $payload = $this->adminStoreChatService->adminPayload($id, $afterId);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Conversation not found.', null, 404);
        }

        return ResponseHelper::success([
            'messages' => $payload['messages']->map(fn ($m) => $this->serializeMessage($m)),
        ]);
    }

    public function storeMessage(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isAdmin()) {
            return ResponseHelper::error('Only admin accounts can access this.', null, 403);
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
            $message = $this->adminStoreChatService->sendFromAdmin(
                $user,
                $id,
                (string) $request->input('body', ''),
                $request->file('attachment')
            );
        } catch (\InvalidArgumentException $e) {
            return ResponseHelper::error($e->getMessage());
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return ResponseHelper::error('Conversation not found.', null, 404);
        }

        return ResponseHelper::success([
            'message' => $this->serializeMessage($message),
        ], 'Message sent', 201);
    }

    private function serializeConversation(AdminStoreChatConversation $c): array
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
