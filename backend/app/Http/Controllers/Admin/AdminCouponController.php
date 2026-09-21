<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Services\Admin\AdminActivityLogger;
use App\Services\Coupon\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCouponController extends Controller
{
    public function __construct(private CouponService $couponService) {}

    public function index(Request $request): JsonResponse
    {
        $this->couponService->activateDueCoupons();
        $query = Coupon::withTrashed()->with(['store:id,user_id,name', 'store.user:id,name,email'])
            ->withCount(['usages', 'usages as redeemed_usages_count' => fn ($usage) => $usage->where('status', 'redeemed')]);
        if ($request->filled('store_id')) $query->where('store_id', $request->store_id);
        if ($request->filled('type')) $query->where('discount_type', $request->type);
        if ($request->filled('scope')) $query->where('scope', $request->scope);
        if ($request->filled('status')) {
            match ($request->status) {
                'active' => $query->where('is_active', true)->where('status', 'active')->whereNull('admin_disabled_at')->whereNull('archived_at')
                    ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                    ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))
                    ->where(fn ($q) => $q->whereNull('usage_limit')->orWhereRaw('(usage_count + reserved_count) < usage_limit')),
                'inactive' => $query->where(fn ($q) => $q->where('status', 'inactive')->orWhere('is_active', false)),
                'paused' => $query->where('status', 'paused'),
                'scheduled' => $query->where('starts_at', '>', now()),
                'expired' => $query->where('ends_at', '<=', now()),
                'exhausted' => $query->whereNotNull('usage_limit')->whereRaw('(usage_count + reserved_count) >= usage_limit'),
                'disabled' => $query->whereNotNull('admin_disabled_at'),
                'archived' => $query->where(fn ($q) => $q->whereNotNull('archived_at')->orWhereNotNull('deleted_at')),
                default => $query->where('status', $request->status),
            };
        }
        if ($request->has('is_active')) $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        if ($request->filled('search')) $query->where(fn ($q) => $q->where('code', 'like', '%'.$request->search.'%')->orWhere('description', 'like', '%'.$request->search.'%'));
        return ResponseHelper::success($query->latest()->paginate(min(100, max(1, (int) $request->get('per_page', 20)))), 'Coupons retrieved successfully.');
    }

    public function show(int $id): JsonResponse
    {
        $coupon = Coupon::withTrashed()->with(['store.user:id,name,email', 'products', 'categories', 'variants', 'audits.actor:id,name'])
            ->withCount('usages')->findOrFail($id);
        return ResponseHelper::success($coupon, 'Coupon retrieved successfully.');
    }

    public function usageHistory(Request $request, int $id): JsonResponse
    {
        $coupon = Coupon::withTrashed()->findOrFail($id);
        $usages = CouponUsage::where('coupon_id', $coupon->id)->with([
            'storeOrder:id,order_id,store_id,status,payment_status,total', 'order:id,order_no', 'user:id,name,profile_image',
        ])->latest()->paginate(min(100, max(1, (int) $request->get('per_page', 20))));
        return ResponseHelper::success($usages, 'Coupon usage history retrieved successfully.');
    }

    public function auditHistory(int $id): JsonResponse
    {
        $coupon = Coupon::withTrashed()->findOrFail($id);
        return ResponseHelper::success($coupon->audits()->with('actor:id,name')->latest()->paginate(50), 'Coupon audit history retrieved successfully.');
    }

    /** Existing toggle route remains compatible but now means global disable/re-enable. */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $coupon = Coupon::withTrashed()->findOrFail($id);
        return $coupon->admin_disabled_at ? $this->enable($request, $coupon) : $this->applyDisable($request, $coupon);
    }

    public function disable(Request $request, int $id): JsonResponse
    {
        return $this->applyDisable($request, Coupon::withTrashed()->findOrFail($id));
    }

    public function enable(Request $request, int|Coupon $id): JsonResponse
    {
        $coupon = $id instanceof Coupon ? $id : Coupon::withTrashed()->findOrFail($id);
        if ($coupon->archived_at || $coupon->trashed()) return ResponseHelper::error('Archived coupons cannot be re-enabled.', null, 409);
        $before = $coupon->toArray();
        $coupon->update(['admin_disabled_at' => null, 'admin_disabled_by' => null]);
        $this->couponService->audit($coupon, $request->user(), 'admin_enabled', $before, $coupon->fresh()->toArray());
        $this->log($request, 'coupon.enable', $coupon);
        return ResponseHelper::success($coupon->fresh()->load('store')->loadCount('usages'), 'Coupon re-enabled globally.');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $coupon = Coupon::withTrashed()->findOrFail($id);
        $before = $coupon->toArray();
        $coupon->update(['archived_at' => now(), 'status' => 'archived', 'is_active' => false]);
        $this->couponService->audit($coupon, $request->user(), 'admin_archived', $before, $coupon->fresh()->toArray());
        $this->log($request, 'coupon.archive', $coupon);
        return ResponseHelper::success(null, 'Coupon archived successfully.');
    }

    private function applyDisable(Request $request, Coupon $coupon): JsonResponse
    {
        if ($coupon->archived_at || $coupon->trashed()) return ResponseHelper::error('Archived coupons cannot be disabled.', null, 409);
        $before = $coupon->toArray();
        $coupon->update(['admin_disabled_at' => now(), 'admin_disabled_by' => $request->user()->id]);
        $this->couponService->audit($coupon, $request->user(), 'admin_disabled', $before, $coupon->fresh()->toArray());
        $this->log($request, 'coupon.disable', $coupon);
        return ResponseHelper::success($coupon->fresh()->load('store')->loadCount('usages'), 'Coupon disabled globally.');
    }

    private function log(Request $request, string $action, Coupon $coupon): void
    {
        AdminActivityLogger::log($request->user(), $action, 'coupon', $coupon->id, true, ['code' => $coupon->code, 'store_id' => $coupon->store_id], $request);
    }
}
