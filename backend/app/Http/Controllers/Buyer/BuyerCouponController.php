<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Coupon\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BuyerCouponController extends Controller
{
    public function __construct(
        private CouponService $couponService
    ) {}

    /**
     * Validate coupon code.
     */
    public function validate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string',
            'order_total' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $user = Auth::user();
        $result = $this->couponService->validateCoupon(
            $request->code,
            $user->id,
            (float) $request->order_total
        );

        if (!$result['valid']) {
            return ResponseHelper::error($result['message'], null, 400);
        }

        return ResponseHelper::success([
            'coupon' => [
                'id' => $result['coupon']->id,
                'code' => $result['coupon']->code,
                'discount_type' => $result['coupon']->discount_type,
                'discount_value' => $result['coupon']->discount_value,
            ],
            'discount_amount' => $result['discount_amount'],
            'message' => $result['message'],
        ], 'Coupon validated successfully');
    }
}
