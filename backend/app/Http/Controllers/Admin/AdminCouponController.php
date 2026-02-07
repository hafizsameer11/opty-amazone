<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCouponController extends Controller
{
    /**
     * Get all coupons from all sellers.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Coupon::with('store', 'store.user')
            ->withCount('usages');

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active === 'true' || $request->is_active === true);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $coupons = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($coupons, 'Coupons retrieved successfully');
    }
}
