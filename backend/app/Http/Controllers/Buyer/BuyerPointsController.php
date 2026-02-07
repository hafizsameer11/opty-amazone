<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Points\PointService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class BuyerPointsController extends Controller
{
    public function __construct(
        private PointService $pointService
    ) {}

    /**
     * Get user's points balance.
     */
    public function getBalance(): JsonResponse
    {
        $user = Auth::user();
        $balance = $this->pointService->getBalance($user);
        $available = $this->pointService->getAvailablePoints($user);

        return ResponseHelper::success([
            'balance' => $balance,
            'available' => $available,
            'expired' => $balance - $available,
        ], 'Points balance retrieved successfully');
    }

    /**
     * Get point transactions.
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $user = Auth::user();
        $limit = $request->get('limit', 50);
        $transactions = $this->pointService->getTransactions($user, $limit);

        return ResponseHelper::success($transactions, 'Transactions retrieved successfully');
    }

    /**
     * Redeem points for discount.
     */
    public function redeem(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'points' => 'required|numeric|min:1',
            'order_id' => 'nullable|exists:orders,id',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        $user = Auth::user();
        $order = $request->order_id ? \App\Models\Order::find($request->order_id) : null;

        try {
            $result = $this->pointService->redeemPoints($user, (float) $request->points, $order);

            return ResponseHelper::success($result, 'Points redeemed successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage(), null, 400);
        }
    }
}
