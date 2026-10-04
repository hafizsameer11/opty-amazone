<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\AdminViewedSection;
use App\Services\Admin\AdminSectionRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/**
 * Small, read-only aggregate used by the admin shell for live badges.
 * Individual pages still own their full data queries; this endpoint only
 * prevents the sidebar from needing one request per badge.
 */
class AdminLiveSummaryController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $sections = AdminSectionRegistry::unreadFor(
            AdminSectionRegistry::viewedTimestamps((int) $request->user()->id)
        );

        return ResponseHelper::success([
            'notifications' => $request->user()->unreadNotifications()->count(),
            // Flat counters are kept for backwards compatibility with existing
            // consumers; `sections` below is what the sidebar dots read.
            'orders' => $sections['orders']['total'] ?? 0,
            'messages' => $sections['messages']['total'] ?? 0,
            'support' => $sections['support']['total'] ?? 0,
            'sellers' => $sections['sellers']['total'] ?? 0,
            'stores' => $sections['sellers']['total'] ?? 0,
            'products' => $sections['products']['total'] ?? 0,
            'reports' => $sections['reports']['total'] ?? 0,
            'banners' => $sections['banners']['total'] ?? 0,
            'boost_campaigns' => $sections['boost_campaigns']['total'] ?? 0,
            'referrals' => $sections['referrals']['total'] ?? 0,
            'withdrawals' => $sections['withdrawals']['total'] ?? 0,
            // These modules currently have no moderation/unread state in the
            // backend. They are included so the frontend contract is stable
            // when those workflows gain one later.
            'leads' => 0,
            'categories' => 0,
            'coupons' => 0,
            'discount_campaigns' => $sections['discount_campaigns']['total'] ?? 0,
            'points' => 0,
            'search' => 0,
            'sections' => $sections,
        ], 'Admin live summary retrieved successfully');
    }

    /**
     * Record that the admin has opened the given sections so their dots clear.
     */
    public function markViewed(Request $request): JsonResponse
    {
        $sections = array_keys(AdminSectionRegistry::definitions());

        $data = $request->validate([
            'sections' => ['required', 'array', 'min:1'],
            'sections.*' => ['required', 'string', Rule::in($sections)],
        ]);

        $now = now();
        $adminId = (int) $request->user()->id;
        $recorded = [];

        foreach (array_unique($data['sections']) as $section) {
            AdminViewedSection::query()->updateOrCreate(
                ['admin_id' => $adminId, 'section' => $section],
                ['viewed_at' => $now]
            );
            $recorded[$section] = Carbon::parse($now)->toIso8601String();
        }

        return ResponseHelper::success([
            'viewed' => $recorded,
            'sections' => AdminSectionRegistry::unreadFor(
                AdminSectionRegistry::viewedTimestamps($adminId)
            ),
        ], 'Sections marked as viewed');
    }
}