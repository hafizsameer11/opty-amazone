<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Coupon\CouponService;
use App\Services\Coupon\CouponValidationException;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SellerCouponController extends Controller
{
    public function __construct(private CouponService $couponService) {}

    public function index(Request $request): JsonResponse
    {
        $store = $this->sellerStore($request);
        if (! $store) return ResponseHelper::error('Store not found.', null, 404);
        $this->couponService->activateDueCoupons();
        $query = Coupon::where('store_id', $store->id)->whereNull('archived_at')->with([
            'products:id,name,sku',
            'categories:id,name',
            // Product variants have colour/price fields, not a SKU column.
            // Selecting sku here made the coupon index fail before it could
            // render, including for a seller who has no coupons yet.
            'variants:id,product_id,color_name,color_code,price,stock_quantity',
        ])
            ->withCount(['usages', 'usages as redeemed_usages_count' => fn ($query) => $query->where('status', 'redeemed')]);
        if ($request->filled('search')) $query->where(fn ($q) => $q->where('code', 'like', '%'.$request->search.'%')->orWhere('description', 'like', '%'.$request->search.'%'));
        if ($request->filled('type')) $query->where('discount_type', $request->type);
        if ($request->filled('scope')) $query->where('scope', $request->scope);
        if ($request->filled('status')) {
            match ($request->status) {
                'active' => $query->where('is_active', true)->where('status', 'active')->whereNull('admin_disabled_at')
                    ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
                    ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))
                    ->where(fn ($q) => $q->whereNull('usage_limit')->orWhereRaw('(usage_count + reserved_count) < usage_limit')),
                'inactive' => $query->where(fn ($q) => $q->where('status', 'inactive')->orWhere('is_active', false)),
                'paused' => $query->where('status', 'paused'),
                'scheduled' => $query->where('starts_at', '>', now()),
                'expired' => $query->where('ends_at', '<=', now()),
                'exhausted' => $query->whereNotNull('usage_limit')->whereRaw('(usage_count + reserved_count) >= usage_limit'),
                'disabled' => $query->whereNotNull('admin_disabled_at'),
                default => $query->where('status', $request->status),
            };
        }
        if ($request->filled('starts_from')) $query->whereDate('starts_at', '>=', $request->starts_from);
        if ($request->filled('ends_to')) $query->whereDate('ends_at', '<=', $request->ends_to);
        if ($request->has('is_active')) $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        $sort = in_array($request->get('sort_by'), ['code', 'discount_type', 'starts_at', 'ends_at', 'created_at'], true) ? $request->get('sort_by') : 'created_at';
        $direction = $request->get('sort_order') === 'asc' ? 'asc' : 'desc';
        $coupons = $query->orderBy($sort, $direction)->paginate(min(100, max(1, (int) $request->get('per_page', 15))));

        return ResponseHelper::success(['coupons' => $coupons, 'statistics' => $this->couponService->getStoreCouponStats($store->id)], 'Coupons retrieved successfully.');
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $store = $this->sellerStore($request);
        if (! $store) return ResponseHelper::error('Store not found.', null, 404);
        $coupon = Coupon::where('store_id', $store->id)->with(['store', 'products', 'categories', 'variants', 'audits.actor:id,name'])
            ->withCount('usages')->findOrFail($id);
        return ResponseHelper::success($coupon, 'Coupon retrieved successfully.');
    }

    public function store(Request $request): JsonResponse
    {
        $store = $this->sellerStore($request);
        if (! $store) return ResponseHelper::error('Store not found.', null, 404);
        $data = $this->validated($request);
        if ($data instanceof JsonResponse) return $data;
        $data = $this->applySchedule($data);
        if ($data instanceof JsonResponse) return $data;

        try {
            return DB::transaction(function () use ($data, $store, $request) {
                $code = strtoupper(trim($data['code']));
                if (Coupon::withTrashed()->whereRaw('UPPER(code) = ?', [$code])->exists()) {
                    return ResponseHelper::validationError(['code' => ['This coupon code is already in use.']]);
                }
                $coupon = Coupon::create($this->attributes($data, $store->id));
                $this->couponService->syncTargets($coupon, $data);
                $this->couponService->audit($coupon, $request->user(), 'created', null, $coupon->fresh()->toArray());
                return ResponseHelper::success($coupon->fresh()->load(['products', 'categories', 'variants']), 'Coupon created successfully.', 201);
            });
        } catch (CouponValidationException $exception) {
            return ResponseHelper::error($exception->getMessage(), ['reason' => $exception->reason], 422);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $store = $this->sellerStore($request);
        if (! $store) return ResponseHelper::error('Store not found.', null, 404);
        $coupon = Coupon::where('store_id', $store->id)->findOrFail($id);
        $data = $this->validated($request, $coupon, false);
        if ($data instanceof JsonResponse) return $data;
        $data = $this->applySchedule($data, $coupon, false);
        if ($data instanceof JsonResponse) return $data;

        try {
            return DB::transaction(function () use ($coupon, $data, $request, $store) {
                $locked = Coupon::whereKey($coupon->id)->lockForUpdate()->firstOrFail();
                $before = $locked->toArray();
                if (isset($data['code'])) {
                    $code = strtoupper(trim($data['code']));
                    if (Coupon::withTrashed()->whereKeyNot($locked->id)->whereRaw('UPPER(code) = ?', [$code])->exists()) {
                        return ResponseHelper::validationError(['code' => ['This coupon code is already in use.']]);
                    }
                }
                $locked->update($this->attributes($data, $store->id, true));
                if (array_key_exists('scope', $data) || array_key_exists('product_ids', $data) || array_key_exists('category_ids', $data) || array_key_exists('variant_ids', $data)) {
                    $this->couponService->syncTargets($locked, $data);
                }
                $this->couponService->audit($locked, $request->user(), 'updated', $before, $locked->fresh()->toArray());
                return ResponseHelper::success($locked->fresh()->load(['products', 'categories', 'variants']), 'Coupon updated successfully.');
            });
        } catch (CouponValidationException $exception) {
            return ResponseHelper::error($exception->getMessage(), ['reason' => $exception->reason], 422);
        }
    }

    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $coupon = $this->ownedCoupon($request, $id);
        $before = $coupon->toArray();
        $nextActive = ! $coupon->is_active;
        $coupon->update([
            'is_active' => $nextActive,
            'status' => $nextActive ? ($coupon->starts_at?->isFuture() ? 'scheduled' : 'active') : 'inactive',
        ]);
        $this->couponService->audit($coupon, $request->user(), $coupon->is_active ? 'activated' : 'deactivated', $before, $coupon->fresh()->toArray());
        return ResponseHelper::success($coupon->fresh(), 'Coupon status updated successfully.');
    }

    public function pause(Request $request, int $id): JsonResponse
    {
        $coupon = $this->ownedCoupon($request, $id);
        $before = $coupon->toArray();
        $coupon->update(['status' => 'paused', 'is_active' => false]);
        $this->couponService->audit($coupon, $request->user(), 'paused', $before, $coupon->fresh()->toArray());
        return ResponseHelper::success($coupon->fresh(), 'Coupon paused successfully.');
    }

    public function resume(Request $request, int $id): JsonResponse
    {
        $coupon = $this->ownedCoupon($request, $id);
        if ($coupon->admin_disabled_at) return ResponseHelper::error('This coupon has been disabled by an administrator.', null, 403);
        $before = $coupon->toArray();
        $coupon->update(['status' => $coupon->starts_at?->isFuture() ? 'scheduled' : 'active', 'is_active' => true]);
        $this->couponService->audit($coupon, $request->user(), 'resumed', $before, $coupon->fresh()->toArray());
        return ResponseHelper::success($coupon->fresh(), 'Coupon resumed successfully.');
    }

    /** Archive instead of permanently deleting records with financial history. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $coupon = $this->ownedCoupon($request, $id);
        $before = $coupon->toArray();
        $coupon->update(['archived_at' => now(), 'status' => 'archived', 'is_active' => false]);
        $this->couponService->audit($coupon, $request->user(), 'archived', $before, $coupon->fresh()->toArray());
        return ResponseHelper::success(null, 'Coupon archived successfully.');
    }

    public function usageHistory(Request $request, int $id): JsonResponse
    {
        $coupon = $this->ownedCoupon($request, $id);
        $usages = CouponUsage::where('coupon_id', $coupon->id)->with([
            // Sellers need redemption/order context, not a buyer profile dump.
            'storeOrder:id,order_id,store_id,status,payment_status,total', 'order:id,order_no',
        ])->latest()->paginate(min(100, max(1, (int) $request->get('per_page', 20))));
        return ResponseHelper::success($usages, 'Coupon usage history retrieved successfully.');
    }

    public function analytics(Request $request): JsonResponse
    {
        $store = $this->sellerStore($request);
        if (! $store) return ResponseHelper::error('Store not found.', null, 404);
        $couponIds = Coupon::where('store_id', $store->id)->pluck('id');
        $history = CouponUsage::whereIn('coupon_id', $couponIds)->whereIn('status', ['redeemed', 'refunded'])
            ->selectRaw('DATE(created_at) as date, COUNT(*) as usages, COALESCE(SUM(discount_amount + shipping_discount), 0) as discounts')
            ->groupBy('date')->orderBy('date')->get();
        return ResponseHelper::success(['summary' => $this->couponService->getStoreCouponStats($store->id), 'performance' => $history], 'Coupon analytics retrieved successfully.');
    }

    public function targets(Request $request, string $type): JsonResponse
    {
        $store = $this->sellerStore($request);
        if (! $store) return ResponseHelper::error('Store not found.', null, 404);
        $data = match ($type) {
            'products' => Product::where('store_id', $store->id)->select('id', 'name', 'sku', 'category_id', 'sub_category_id')->orderBy('name')->get(),
            'categories' => Category::whereHas('products', fn ($query) => $query->where('store_id', $store->id))->select('id', 'name', 'parent_id')->orderBy('name')->get(),
            'variants' => ProductVariant::whereHas('product', fn ($query) => $query->where('store_id', $store->id))->with('product:id,name')->select('id', 'product_id', 'color_name', 'color_code', 'price', 'stock_quantity')->get(),
            default => abort(404),
        };
        return ResponseHelper::success($data, 'Coupon targets retrieved successfully.');
    }

    private function sellerStore(Request $request)
    {
        return $request->user()->store;
    }

    private function ownedCoupon(Request $request, int $id): Coupon
    {
        $store = $this->sellerStore($request);
        abort_unless($store, 404, 'Store not found.');
        return Coupon::where('store_id', $store->id)->findOrFail($id);
    }

    private function validated(Request $request, ?Coupon $coupon = null, bool $creating = true): array|JsonResponse
    {
        $prefix = $creating ? 'required' : 'sometimes';
        $validator = Validator::make($request->all(), [
            'code' => [$prefix, 'string', 'max:50'], 'description' => ['nullable', 'string', 'max:1000'],
            'discount_type' => [$prefix, 'in:percentage,fixed_amount,free_shipping'],
            'discount_value' => ['nullable', 'numeric', 'min:0'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'], 'usage_limit' => ['nullable', 'integer', 'min:1'],
            'usage_per_user' => ['nullable', 'integer', 'min:1'], 'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date'], 'schedule_timezone' => ['nullable', 'string', 'max:64', 'timezone'],
            'launch_mode' => ['nullable', 'in:run_now,schedule'], 'is_active' => ['nullable', 'boolean'],
            'status' => ['nullable', 'in:active,inactive,paused'], 'scope' => [$creating ? 'required' : 'sometimes', 'in:store,products,categories,variants'],
            'is_public' => ['nullable', 'boolean'], 'followers_only' => ['nullable', 'boolean'], 'first_order_only' => ['nullable', 'boolean'],
            'product_ids' => ['nullable', 'array'], 'product_ids.*' => ['integer'],
            'category_ids' => ['nullable', 'array'], 'category_ids.*' => ['integer'],
            'variant_ids' => ['nullable', 'array'], 'variant_ids.*' => ['integer'],
        ]);
        if ($validator->fails()) return ResponseHelper::validationError($validator->errors());
        $data = $validator->validated();
        $type = $data['discount_type'] ?? $coupon?->discount_type;
        $value = $data['discount_value'] ?? $coupon?->discount_value;
        if ($type !== 'free_shipping' && ($value === null || $value === '')) return ResponseHelper::validationError(['discount_value' => ['A discount value is required.']]);
        if ($type === 'percentage' && (float) $value > 100) return ResponseHelper::validationError(['discount_value' => ['Percentage coupons cannot exceed 100.']]);
        if ($type === 'free_shipping') $data['discount_value'] = 0;
        return $data;
    }

    private function attributes(array $data, int $storeId, bool $partial = false): array
    {
        $fields = ['description', 'discount_type', 'discount_value', 'min_order_amount', 'usage_limit', 'usage_per_user', 'starts_at', 'ends_at', 'schedule_timezone', 'is_active', 'status', 'scope', 'is_public', 'followers_only', 'first_order_only'];
        $result = $partial ? [] : ['store_id' => $storeId];
        foreach ($fields as $field) if (array_key_exists($field, $data)) $result[$field] = $data[$field];
        if (array_key_exists('code', $data)) $result['code'] = strtoupper(trim($data['code']));
        if (! $partial) {
            $result += ['is_active' => true, 'status' => 'active', 'scope' => 'store', 'is_public' => true, 'followers_only' => false, 'first_order_only' => false];
            $result['applicable_to'] = $result['scope'];
        } elseif (isset($result['scope'])) $result['applicable_to'] = $result['scope'];
        return $result;
    }

    /**
     * Coupon date inputs are entered in a Seller's browser timezone, then
     * stored as UTC instants. This mirrors Discount Campaign scheduling and
     * ensures that a time such as 12:00 in Asia/Karachi is not treated as
     * 12:00 on the server.
     */
    private function applySchedule(array $data, ?Coupon $coupon = null, bool $creating = true): array|JsonResponse
    {
        $timezone = (string) ($data['schedule_timezone'] ?? $coupon?->schedule_timezone ?? 'UTC');
        $now = CarbonImmutable::now('UTC');
        $start = null;
        $end = null;

        try {
            if (array_key_exists('starts_at', $data) && filled($data['starts_at'])) {
                $start = CarbonImmutable::parse($data['starts_at'], $timezone)->utc();
            }
            if (array_key_exists('ends_at', $data) && filled($data['ends_at'])) {
                $end = CarbonImmutable::parse($data['ends_at'], $timezone)->utc();
            }
        } catch (\Throwable) {
            return ResponseHelper::validationError(['starts_at' => ['Enter a valid scheduled date and time.']]);
        }

        $launchMode = $data['launch_mode'] ?? null;
        if ($launchMode === 'schedule' && ! $start) {
            return ResponseHelper::validationError(['starts_at' => ['Choose a future start time when scheduling a coupon.']]);
        }
        if ($launchMode === 'schedule' && $start?->lte($now)) {
            return ResponseHelper::validationError(['starts_at' => ['Choose a future start time when scheduling a coupon.']]);
        }

        $effectiveStart = $launchMode === 'run_now' ? $now : $start;
        if ($end && $end->lte($effectiveStart ?? $now)) {
            return ResponseHelper::validationError(['ends_at' => ['Choose an end time after the coupon starts.']]);
        }
        if ($end && $end->lte($now)) {
            return ResponseHelper::validationError(['ends_at' => ['Choose an end time in the future.']]);
        }

        // Preserve legacy callers that only provide a future starts_at while
        // giving modern callers explicit Run now / Schedule behavior.
        if ($launchMode === 'run_now') {
            $data['starts_at'] = $now;
            $data['status'] = 'active';
            $data['is_active'] = true;
        } elseif ($launchMode === 'schedule' || ($start?->isFuture() && ($data['is_active'] ?? $coupon?->is_active ?? true))) {
            $data['starts_at'] = $start;
            $data['status'] = 'scheduled';
            $data['is_active'] = true;
        } elseif ($start) {
            $data['starts_at'] = $start;
        }

        if ($end) $data['ends_at'] = $end;
        $data['schedule_timezone'] = $timezone;

        return $data;
    }
}
