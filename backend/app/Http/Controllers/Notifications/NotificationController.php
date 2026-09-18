<?php

namespace App\Http\Controllers\Notifications;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->latest()->paginate(min(100, max(1, $request->integer('per_page', 30))));

        return ResponseHelper::success([
            'notifications' => collect($notifications->items())->map(fn ($notification) => $this->serialize($notification))->values(),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function unread(Request $request): JsonResponse
    {
        return ResponseHelper::success([
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->whereKey($id)->firstOrFail();
        $notification->markAsRead();

        return ResponseHelper::success([
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ], 'Notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return ResponseHelper::success(['unread_count' => 0], 'All notifications marked as read.');
    }

    private function serialize(object $notification): array
    {
        $data = is_array($notification->data) ? $notification->data : [];

        return [
            'id' => (string) $notification->id,
            'type' => $data['event'] ?? $notification->type,
            'title' => $data['title'] ?? 'Notification',
            'message' => $data['message'] ?? '',
            'url' => $data['url'] ?? null,
            'context' => $data['context'] ?? [],
            'read_at' => $notification->read_at?->toISOString(),
            'created_at' => $notification->created_at?->toISOString(),
        ];
    }
}
