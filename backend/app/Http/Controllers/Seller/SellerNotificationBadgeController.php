<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\AdminStoreChatConversation;
use App\Models\StoreChatConversation;
use App\Models\SupportTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerNotificationBadgeController extends Controller
{
    /**
     * Aggregated read-aware counts for Seller Hub badges. Message and support
     * rows own their read state; order events use Laravel notifications and
     * are cleared when the seller opens the order queue.
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only seller accounts can access this.', null, 403);
        }

        return ResponseHelper::success($this->summary($user));
    }

    public function markCategoryRead(Request $request): JsonResponse
    {
        $data = $request->validate(['category' => ['required', 'in:orders']]);
        $user = $request->user();
        abort_unless($user->isSeller(), 403, 'Only seller accounts can access this.');

        if ($data['category'] === 'orders') {
            $user->unreadNotifications()->get()
                ->filter(fn ($notification) => str_starts_with((string) (($notification->data['event'] ?? null)), 'order.'))
                ->each->markAsRead();
        }

        return ResponseHelper::success($this->summary($user), 'Unread items updated.');
    }

    /** @return array{messages:int,orders:int,support:int,files:int,notifications:int,total:int} */
    private function summary($user): array
    {
        $store = $user->store;
        $unreadNotifications = $user->unreadNotifications()->get();

        if (! $store) {
            return [
                'messages' => 0,
                'orders' => 0,
                'support' => 0,
                // Attachments arrive inside a message or support reply; there
                // is no independent file inbox to falsely mark as unread.
                'files' => 0,
                'notifications' => $unreadNotifications->count(),
                'total' => $unreadNotifications->count(),
            ];
        }

        $buyerChatUnread = (int) StoreChatConversation::query()
            ->where('store_id', $store->id)
            ->sum('seller_unread_count');

        $adminChatUnread = (int) AdminStoreChatConversation::query()
            ->where('store_id', $store->id)
            ->sum('seller_unread_count');

        $orderNotifications = (int) $unreadNotifications
            ->filter(fn ($notification) => str_starts_with((string) (($notification->data['event'] ?? null)), 'order.'))
            ->count();

        $supportUnread = (int) SupportTicket::query()
            ->where('user_id', $user->id)
            ->where('user_role', 'seller')
            ->sum('user_unread_count');

        $notifications = (int) $unreadNotifications->count();
        $messages = $buyerChatUnread + $adminChatUnread;

        return [
            'messages' => $messages,
            'orders' => $orderNotifications,
            'support' => $supportUnread,
            'files' => 0,
            'notifications' => $notifications,
            // Order alerts are Laravel notifications too, so do not count
            // them twice in the header's overall total.
            'total' => $messages + $supportUnread + $notifications,
        ];
    }
}
