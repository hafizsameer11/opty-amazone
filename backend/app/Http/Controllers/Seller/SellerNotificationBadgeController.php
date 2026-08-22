<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\AdminStoreChatConversation;
use App\Models\StoreChatConversation;
use App\Models\StoreOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerNotificationBadgeController extends Controller
{
    /**
     * Aggregated unread counts for seller sidebar badges.
     */
    public function unread(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSeller()) {
            return ResponseHelper::error('Only seller accounts can access this.', null, 403);
        }

        $store = $user->store;
        if (!$store) {
            return ResponseHelper::success([
                'messages' => 0,
                'orders' => 0,
            ]);
        }

        $buyerChatUnread = (int) StoreChatConversation::query()
            ->where('store_id', $store->id)
            ->sum('seller_unread_count');

        $adminChatUnread = (int) AdminStoreChatConversation::query()
            ->where('store_id', $store->id)
            ->sum('seller_unread_count');

        $pendingOrders = (int) StoreOrder::query()
            ->where('store_id', $store->id)
            ->where('status', 'pending')
            ->count();

        return ResponseHelper::success([
            'messages' => $buyerChatUnread + $adminChatUnread,
            'orders' => $pendingOrders,
        ]);
    }
}
