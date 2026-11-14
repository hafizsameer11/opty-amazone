<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Vista360Plan;
use App\Services\Vista360\Vista360SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerVista360Controller extends Controller
{
    private function context(Request $request): array
    {
        $seller = $request->user();
        $store = $seller?->store;
        abort_unless($seller && $seller->isSeller() && $store, 404, 'An active seller store is required.');

        return [$seller, $store];
    }

    public function plans(Vista360SubscriptionService $subscriptions): JsonResponse
    {
        return ResponseHelper::success($subscriptions->plans()->map(function ($plan) {
            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'slug' => $plan->slug,
                'description' => $plan->description,
                'display_details' => $plan->display_details,
                'prices' => $plan->prices->groupBy('duration_months')->map(fn ($prices) => $prices->first()->only(['id', 'duration_months', 'amount_cents', 'currency', 'version']))->values(),
                'features' => $plan->features->map(fn ($feature) => $feature->only(['feature_key', 'title', 'description', 'value']))->values(),
            ];
        })->values(), 'Vista Express 360 plans retrieved.');
    }

    public function subscription(Request $request, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        [$seller, $store] = $this->context($request);
        return ResponseHelper::success($subscriptions->current($seller, $store), 'Vista Express 360 subscription retrieved.');
    }

    public function activate(Request $request, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:vista360_plans,id'],
            'duration_months' => ['required', 'integer', 'in:1,6,12'],
            'idempotency_key' => ['nullable', 'string', 'min:16', 'max:120', 'regex:/^[A-Za-z0-9_-]+$/'],
        ]);
        [$seller, $store] = $this->context($request);
        $result = $subscriptions->activateComplimentarySubscription($seller, $store, $data['plan_id'], $data['duration_months'], $data['idempotency_key'] ?? null);

        return ResponseHelper::success([
            'activation_mode' => $result['activation_mode'],
            'subscription' => $subscriptions->subscriptionPayload($result['subscription']),
        ], 'Subscription activated. No payment was collected.', 201);
    }

    public function cancelFuture(Request $request, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);
        [$seller, $store] = $this->context($request);
        $count = $subscriptions->cancelFutureRenewals($seller, $store, $data['reason'] ?? null);
        return ResponseHelper::success([
            'cancelled_future_subscriptions' => $count,
            'current' => $subscriptions->current($seller, $store),
        ], 'Future renewal terms cancelled. Your current term remains available until its expiry.');
    }

    public function crmLink(Request $request, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        [$seller, $store] = $this->context($request);
        $entitlement = $subscriptions->entitlement($seller, $store);
        if (! $subscriptions->allows($entitlement, 'crm.access')) {
            return ResponseHelper::error('An active Vista Express 360 subscription with CRM access is required to open the CRM.', ['entitlement' => $entitlement], 403);
        }
        return ResponseHelper::success([
            'url' => rtrim((string) config('vista360.crm_url'), '/').'/auth/sign-in?provider=vista',
            'entitlement' => $entitlement,
        ], 'CRM access available.');
    }
}
