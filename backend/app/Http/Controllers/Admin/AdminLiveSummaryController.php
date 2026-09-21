<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\{AdminStoreChatConversation, AdCampaign, BannerCampaign, DiscountCampaign, Product, ReferralCampaign, SellerWithdrawal, Store, StoreOrder, StoreReport, SupportTicket};
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Small, read-only aggregate used by the admin shell for live badges.
 * Individual pages still own their full data queries; this endpoint only
 * prevents the sidebar from needing one request per badge.
 */
class AdminLiveSummaryController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $activeReportStatuses = [
            StoreReport::STATUS_SUBMITTED,
            StoreReport::STATUS_UNDER_REVIEW,
            StoreReport::STATUS_WAITING_FOR_CUSTOMER,
            StoreReport::STATUS_WAITING_FOR_SELLER,
        ];

        return ResponseHelper::success([
            'notifications' => $request->user()->unreadNotifications()->count(),
            // Pending store orders are the orders that require an admin/seller
            // workflow action. Counting StoreOrder rows also catches orders
            // whose parent payment has already been verified.
            'orders' => StoreOrder::where('status', 'pending')->count(),
            'messages' => (int) AdminStoreChatConversation::query()->sum('admin_unread_count'),
            'support' => SupportTicket::where('admin_unread_count', '>', 0)->count(),
            'sellers' => Store::where('onboarding_status', 'pending_review')->count(),
            'stores' => Store::where('onboarding_status', 'pending_review')->count(),
            'products' => Product::where('is_approved', false)->whereNull('rejection_reason')->count(),
            'reports' => StoreReport::whereIn('status', $activeReportStatuses)->count(),
            'banners' => BannerCampaign::where('approval_status', 'pending')->count(),
            'boost_campaigns' => AdCampaign::where('status', 'pending_review')->count(),
            'referrals' => ReferralCampaign::where('approval_status', 'pending')->count(),
            'withdrawals' => SellerWithdrawal::where('status', 'pending')->count(),
            // These modules currently have no moderation/unread state in the
            // backend. They are included so the frontend contract is stable
            // when those workflows gain one later.
            'leads' => 0,
            'categories' => 0,
            'coupons' => 0,
            'discount_campaigns' => DiscountCampaign::where('approval_status', 'pending')->count(),
            'points' => 0,
            'search' => 0,
        ], 'Admin live summary retrieved successfully');
    }
}
