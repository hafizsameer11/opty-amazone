<?php

namespace App\Services\Admin;

use App\Models\AdminStoreChatConversation;
use App\Models\AdCampaign;
use App\Models\BannerCampaign;
use App\Models\DiscountCampaign;
use App\Models\Product;
use App\Models\ReferralCampaign;
use App\Models\SellerWithdrawal;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\StoreReport;
use App\Models\SupportTicket;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Single source of truth for the admin sidebar's "new since you looked" dots.
 *
 * Every section is a query plus the timestamp column that orders it, so the
 * live summary can report `total` (how much needs attention) and `unread` (how
 * much arrived after this admin last opened the section) from one definition.
 */
class AdminSectionRegistry
{
    /**
     * @return array<string, array{query: \Closure(): Builder, column: string}>
     */
    public static function definitions(): array
    {
        $activeReportStatuses = [
            StoreReport::STATUS_SUBMITTED,
            StoreReport::STATUS_UNDER_REVIEW,
            StoreReport::STATUS_WAITING_FOR_CUSTOMER,
            StoreReport::STATUS_WAITING_FOR_SELLER,
        ];

        return [
            // A registration is "pending" from the moment the seller signs up
            // until an admin decides, so this intentionally keys off `status`
            // rather than the narrower `onboarding_status = pending_review`.
            'sellers' => [
                'query' => fn () => Store::query()->where('status', Store::STATUS_PENDING),
                'column' => 'created_at',
            ],
            'orders' => [
                'query' => fn () => StoreOrder::query()->where('status', 'pending'),
                'column' => 'created_at',
            ],
            'products' => [
                'query' => fn () => Product::query()->where('is_approved', false)->whereNull('rejection_reason'),
                'column' => 'created_at',
            ],
            'support' => [
                'query' => fn () => SupportTicket::query()->where('admin_unread_count', '>', 0),
                'column' => 'created_at',
            ],
            'reports' => [
                'query' => fn () => StoreReport::query()->whereIn('status', $activeReportStatuses),
                'column' => 'created_at',
            ],
            'banners' => [
                'query' => fn () => BannerCampaign::query()->where('approval_status', 'pending'),
                'column' => 'created_at',
            ],
            'discount_campaigns' => [
                'query' => fn () => DiscountCampaign::query()->where('approval_status', 'pending'),
                'column' => 'created_at',
            ],
            'boost_campaigns' => [
                'query' => fn () => AdCampaign::query()->where('status', 'pending_review'),
                'column' => 'created_at',
            ],
            'referrals' => [
                'query' => fn () => ReferralCampaign::query()->where('approval_status', 'pending'),
                'column' => 'created_at',
            ],
            'withdrawals' => [
                'query' => fn () => SellerWithdrawal::query()->where('status', 'pending'),
                'column' => 'created_at',
            ],
            // Chat keeps its own per-conversation unread counters for the seller
            // side, so the admin dot uses the last activity timestamp instead.
            'messages' => [
                'query' => fn () => AdminStoreChatConversation::query(),
                'column' => 'last_message_at',
            ],
        ];
    }

    /**
     * @return array<string, array{total: int, unread: int, viewed_at: ?string}>
     */
    public static function unreadFor(array $viewedAt): array
    {
        $summary = [];

        foreach (self::definitions() as $key => $definition) {
            /** @var Builder $query */
            $query = $definition['query']();
            $total = (clone $query)->count();

            $seen = $viewedAt[$key] ?? null;
            $unread = $seen
                ? (clone $query)->where($definition['column'], '>', $seen)->count()
                : $total;

            $summary[$key] = [
                'total' => $total,
                'unread' => $unread,
                'viewed_at' => $seen?->toIso8601String(),
            ];
        }

        return $summary;
    }

    /**
     * @return array<string, Carbon>
     */
    public static function viewedTimestamps(int $adminId): array
    {
        return \App\Models\AdminViewedSection::query()
            ->where('admin_id', $adminId)
            ->pluck('viewed_at', 'section')
            ->map(fn ($value) => Carbon::parse($value))
            ->all();
    }
}