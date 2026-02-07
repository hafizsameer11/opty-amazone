<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Services\Coupon\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SellerCouponController extends Controller
{
    public function __construct(
        private CouponService $couponService
    ) {}

    /**
     * Get all coupons for the authenticated seller's store.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $query = Coupon::where('store_id', $store->id)
            ->with('store')
            ->withCount('usages');

        // Filter by status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active === 'true' || $request->is_active === true);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $coupons = $query->paginate($request->get('per_page', 15));

        // Add statistics
        $stats = $this->couponService->getStoreCouponStats($store->id);

        return ResponseHelper::success([
            'coupons' => $coupons,
            'statistics' => $stats,
        ], 'Coupons retrieved successfully');
    }

    /**
     * Get coupon details.
     */
    public function show($id): JsonResponse
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $coupon = Coupon::where('store_id', $store->id)
            ->with('store')
            ->withCount('usages')
            ->with(['usages' => function ($query) {
                $query->latest()->limit(10)->with('user', 'order');
            }])
            ->findOrFail($id);

        return ResponseHelper::success($coupon, 'Coupon retrieved successfully');
    }

    /**
     * Create a new coupon.
     */
    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $validator = Validator::make($request->all(), [
            'code' => 'required|string|max:50|unique:coupons,code',
            'description' => 'nullable|string',
            'discount_type' => 'required|in:percentage,fixed_amount,free_shipping,bogo',
            'discount_value' => 'required|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_per_user' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'is_active' => 'nullable|boolean',
            'applicable_to' => 'nullable|string|max:50',
            'conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $coupon = Coupon::create([
            'store_id' => $store->id,
            'code' => strtoupper($request->code),
            'description' => $request->description,
            'discount_type' => $request->discount_type,
            'discount_value' => $request->discount_value,
            'max_discount' => $request->max_discount,
            'min_order_amount' => $request->min_order_amount,
            'usage_limit' => $request->usage_limit,
            'usage_per_user' => $request->usage_per_user,
            'starts_at' => $request->starts_at,
            'ends_at' => $request->ends_at,
            'is_active' => $request->is_active ?? true,
            'applicable_to' => $request->applicable_to,
            'conditions' => $request->conditions,
        ]);

        return ResponseHelper::success($coupon->load('store'), 'Coupon created successfully', 201);
    }

    /**
     * Update coupon.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $coupon = Coupon::where('store_id', $store->id)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code' => 'sometimes|string|max:50|unique:coupons,code,' . $coupon->id,
            'description' => 'nullable|string',
            'discount_type' => 'sometimes|in:percentage,fixed_amount,free_shipping,bogo',
            'discount_value' => 'sometimes|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'usage_per_user' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'is_active' => 'nullable|boolean',
            'applicable_to' => 'nullable|string|max:50',
            'conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $coupon->update($request->only([
            'code',
            'description',
            'discount_type',
            'discount_value',
            'max_discount',
            'min_order_amount',
            'usage_limit',
            'usage_per_user',
            'starts_at',
            'ends_at',
            'is_active',
            'applicable_to',
            'conditions',
        ]));

        if ($request->has('code')) {
            $coupon->code = strtoupper($coupon->code);
            $coupon->save();
        }

        return ResponseHelper::success($coupon->load('store'), 'Coupon updated successfully');
    }

    /**
     * Delete coupon.
     */
    public function destroy($id): JsonResponse
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $coupon = Coupon::where('store_id', $store->id)->findOrFail($id);
        $coupon->delete();

        return ResponseHelper::success(null, 'Coupon deleted successfully');
    }

    /**
     * Toggle coupon active status.
     */
    public function toggleStatus($id): JsonResponse
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $coupon = Coupon::where('store_id', $store->id)->findOrFail($id);
        $coupon->update(['is_active' => !$coupon->is_active]);

        return ResponseHelper::success($coupon, 'Coupon status updated successfully');
    }
}
