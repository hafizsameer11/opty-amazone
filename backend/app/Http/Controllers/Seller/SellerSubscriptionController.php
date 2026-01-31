<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\SubscriptionPlan;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SellerSubscriptionController extends Controller
{
    public function getPlans()
    {
        $plans = SubscriptionPlan::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();

        return ResponseHelper::success($plans, 'Subscription plans retrieved successfully');
    }

    public function getCurrent()
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $subscription = Subscription::where('store_id', $store->id)
            ->where('status', 'active')
            ->with('subscriptionPlan')
            ->first();

        return ResponseHelper::success($subscription, 'Current subscription retrieved successfully');
    }

    public function subscribe(Request $request)
    {
        $request->validate([
            'subscription_plan_id' => 'required|exists:subscription_plans,id',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $plan = SubscriptionPlan::findOrFail($request->subscription_plan_id);

        // Cancel existing subscription
        Subscription::where('store_id', $store->id)
            ->where('status', 'active')
            ->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        // Create new subscription
        $subscription = Subscription::create([
            'store_id' => $store->id,
            'subscription_plan_id' => $plan->id,
            'status' => 'active',
            'start_date' => now(),
            'end_date' => $plan->billing_period === 'monthly' 
                ? now()->addMonth() 
                : now()->addYear(),
        ]);

        return ResponseHelper::success($subscription->load('subscriptionPlan'), 'Subscription activated successfully', 201);
    }

    public function cancel()
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $subscription = Subscription::where('store_id', $store->id)
            ->where('status', 'active')
            ->firstOrFail();

        $subscription->update([
            'status' => 'cancelled',
            'cancelled_at' => now(),
        ]);

        return ResponseHelper::success($subscription, 'Subscription cancelled successfully');
    }

    public function getFeatures()
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $subscription = Subscription::where('store_id', $store->id)
            ->where('status', 'active')
            ->with('subscriptionPlan')
            ->first();

        if (!$subscription) {
            return ResponseHelper::error('No active subscription', null, 404);
        }

        $plan = $subscription->subscriptionPlan;

        return ResponseHelper::success([
            'plan' => $plan,
            'features' => [
                'max_products' => $plan->max_products,
                'max_banners' => $plan->max_banners,
                'promotion_budget_limit' => $plan->promotion_budget_limit,
                'has_analytics' => $plan->has_analytics,
                'has_priority_support' => $plan->has_priority_support,
            ],
        ], 'Features retrieved successfully');
    }
}

