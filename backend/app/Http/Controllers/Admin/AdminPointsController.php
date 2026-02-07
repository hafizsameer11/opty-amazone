<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\PointRule;
use App\Models\PointTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminPointsController extends Controller
{
    /**
     * Get all point rules.
     */
    public function getRules(): JsonResponse
    {
        $rules = PointRule::all();
        return ResponseHelper::success($rules, 'Point rules retrieved successfully');
    }

    /**
     * Create or update point rule.
     */
    public function saveRule(Request $request, $id = null): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:purchase,referral,review,signup,birthday,social_share,redemption',
            'points_per_euro' => 'nullable|numeric|min:0',
            'fixed_points' => 'nullable|numeric|min:0',
            'min_purchase_amount' => 'nullable|numeric|min:0',
            'max_points_per_transaction' => 'nullable|numeric|min:0',
            'points_expiry_days' => 'nullable|integer|min:0',
            'redemption_rate' => 'nullable|numeric|min:0',
            'min_redemption_points' => 'nullable|numeric|min:0',
            'max_redemption_per_order' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'conditions' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        if ($id) {
            $rule = PointRule::findOrFail($id);
            $rule->update($request->all());
        } else {
            $rule = PointRule::create($request->all());
        }

        return ResponseHelper::success($rule, $id ? 'Rule updated successfully' : 'Rule created successfully');
    }

    /**
     * Get point transactions (all users).
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $query = PointTransaction::with('user');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $transactions = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 50));

        return ResponseHelper::success($transactions, 'Transactions retrieved successfully');
    }
}
