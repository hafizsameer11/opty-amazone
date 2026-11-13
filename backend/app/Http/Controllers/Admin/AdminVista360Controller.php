<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use App\Models\Vista360Plan;
use App\Models\Vista360PlanFeature;
use App\Models\Vista360PlanPrice;
use App\Models\Vista360Subscription;
use App\Services\Admin\AdminActivityLogger;
use App\Services\Vista360\Vista360SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminVista360Controller extends Controller
{
    public function plans(): JsonResponse
    {
        $plans = Vista360Plan::with(['prices' => fn ($q) => $q->orderBy('duration_months')->orderByDesc('version'), 'features' => fn ($q) => $q->orderBy('sort_order')])
            ->orderBy('sort_order')->orderBy('id')->get();
        return ResponseHelper::success($plans->map(fn ($plan) => $this->planPayload($plan))->values());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedPlan($request);
        $plan = DB::transaction(function () use ($data) {
            $plan = Vista360Plan::create(collect($data)->except(['prices', 'features'])->all());
            $this->syncPrices($plan, $data['prices']);
            $this->syncFeatures($plan, $data['features']);
            return $plan->fresh(['prices', 'features']);
        });
        AdminActivityLogger::log($request->user(), 'vista360.plan.created', 'vista360_plan', $plan->id, true, ['slug' => $plan->slug], $request);
        return ResponseHelper::success($this->planPayload($plan), 'Vista Express 360 plan created.', 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $plan = Vista360Plan::findOrFail($id);
        $data = $this->validatedPlan($request, $plan);
        $plan = DB::transaction(function () use ($plan, $data) {
            $plan->update(collect($data)->except(['prices', 'features'])->all());
            $this->syncPrices($plan, $data['prices']);
            $this->syncFeatures($plan, $data['features']);
            return $plan->fresh(['prices', 'features']);
        });
        AdminActivityLogger::log($request->user(), 'vista360.plan.updated', 'vista360_plan', $plan->id, true, ['slug' => $plan->slug], $request);
        return ResponseHelper::success($this->planPayload($plan), 'Vista Express 360 plan updated. Existing subscriptions keep their saved terms.');
    }

    public function toggle(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        $plan = Vista360Plan::findOrFail($id);
        $plan->update(['is_active' => $data['is_active']]);
        AdminActivityLogger::log($request->user(), 'vista360.plan.'.($data['is_active'] ? 'enabled' : 'disabled'), 'vista360_plan', $plan->id, true, null, $request);
        return ResponseHelper::success($this->planPayload($plan->fresh(['prices', 'features'])), 'Plan availability updated.');
    }

    public function subscriptions(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:32'],
            'seller_id' => ['nullable', 'integer'],
            'store_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $rows = Vista360Subscription::query()
            ->with(['seller:id,name,email', 'store:id,name', 'plan:id,name,slug', 'payments' => fn ($q) => $q->latest()])
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($data['seller_id'] ?? null, fn ($q, $sellerId) => $q->where('seller_id', $sellerId))
            ->when($data['store_id'] ?? null, fn ($q, $storeId) => $q->where('store_id', $storeId))
            ->when($data['search'] ?? null, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('uuid', 'like', "%{$search}%")
                        ->orWhereHas('seller', fn ($seller) => $seller->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('store', fn ($store) => $store->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest('id')
            ->paginate($data['per_page'] ?? 25);

        return ResponseHelper::success($rows);
    }

    public function subscription(string $uuid, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        $subscription = Vista360Subscription::where('uuid', $uuid)->firstOrFail();
        return ResponseHelper::success($subscriptions->subscriptionPayload($subscription));
    }

    public function manualGrant(Request $request, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate([
            'seller_id' => ['required', 'integer', 'exists:users,id'],
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'plan_id' => ['required', 'integer', 'exists:vista360_plans,id'],
            'duration_months' => ['required', 'integer', 'in:1,6,12'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $seller = User::whereKey($data['seller_id'])->where('role', 'seller')->firstOrFail();
        $store = Store::whereKey($data['store_id'])->where('user_id', $seller->id)->firstOrFail();
        $plan = Vista360Plan::findOrFail($data['plan_id']);
        $subscription = $subscriptions->grantManual($seller, $store, $plan, $data['duration_months'], $request->user(), $data['reason'] ?? null);
        AdminActivityLogger::log($request->user(), 'vista360.subscription.manual_grant', 'vista360_subscription', $subscription->id, true, ['seller_id' => $seller->id, 'duration_months' => $data['duration_months']], $request);
        return ResponseHelper::success($subscriptions->subscriptionPayload($subscription), 'Subscription granted.');
    }

    public function action(Request $request, string $uuid, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate([
            'action' => ['required', Rule::in(['extend', 'activate', 'suspend', 'cancel'])],
            'months' => ['required_if:action,extend', 'nullable', 'integer', 'in:1,6,12'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);
        $subscription = Vista360Subscription::where('uuid', $uuid)->firstOrFail();
        $result = match ($data['action']) {
            'extend' => $subscriptions->extend($subscription, $data['months'], $request->user(), $data['reason'] ?? null),
            'activate' => $subscriptions->changeStatus($subscription, Vista360Subscription::ACTIVE, $request->user(), $data['reason'] ?? null),
            'suspend' => $subscriptions->changeStatus($subscription, Vista360Subscription::SUSPENDED, $request->user(), $data['reason'] ?? null),
            'cancel' => $subscriptions->changeStatus($subscription, Vista360Subscription::CANCELLED, $request->user(), $data['reason'] ?? null),
        };
        AdminActivityLogger::log($request->user(), 'vista360.subscription.'.$data['action'], 'vista360_subscription', $result->id, true, ['reason' => $data['reason'] ?? null], $request);
        return ResponseHelper::success($subscriptions->subscriptionPayload($result), 'Subscription updated.');
    }

    public function payments(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => ['nullable', 'string', 'max:32'], 'per_page' => ['nullable', 'integer', 'min:1', 'max:100']]);
        $payments = \App\Models\Vista360SubscriptionPayment::query()
            ->with(['subscription', 'subscription.seller:id,name,email', 'subscription.store:id,name'])
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest('id')->paginate($data['per_page'] ?? 25);
        return ResponseHelper::success($payments);
    }

    private function validatedPlan(Request $request, ?Vista360Plan $existing = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9-]+$/', Rule::unique('vista360_plans', 'slug')->ignore($existing?->id)],
            'description' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['required', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'display_details' => ['nullable', 'array'],
            'prices' => ['required', 'array', 'min:1', 'max:3'],
            'prices.*.duration_months' => ['required', 'integer', 'distinct', 'in:1,6,12'],
            'prices.*.amount_cents' => ['required', 'integer', 'min:0', 'max:99999999'],
            'prices.*.currency' => ['nullable', 'string', 'size:3'],
            'prices.*.is_active' => ['nullable', 'boolean'],
            'features' => ['present', 'array', 'max:100'],
            'features.*.feature_key' => ['required', 'string', 'max:120', 'distinct', 'regex:/^[a-z0-9._-]+$/'],
            'features.*.title' => ['required', 'string', 'max:160'],
            'features.*.description' => ['nullable', 'string', 'max:2000'],
            'features.*.value' => ['nullable'],
            'features.*.is_active' => ['nullable', 'boolean'],
            'features.*.sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]);
    }

    private function syncPrices(Vista360Plan $plan, array $rows): void
    {
        $durations = collect($rows)->pluck('duration_months')->map(fn ($value) => (int) $value)->all();

        // Omitting a billing term from an admin edit means it is no longer
        // offered to new sellers. Historic price rows and subscription
        // snapshots are deliberately retained for audit and purchased terms.
        $plan->prices()
            ->whereNotIn('duration_months', $durations)
            ->where('is_active', true)
            ->update(['is_active' => false, 'available_until' => now()]);

        foreach ($rows as $row) {
            $current = $plan->prices()->where('duration_months', $row['duration_months'])->orderByDesc('version')->first();
            $amount = (int) $row['amount_cents'];
            $currency = strtoupper($row['currency'] ?? 'EUR');
            if (! $current || $current->amount_cents !== $amount || strtoupper($current->currency) !== $currency) {
                if ($current) {
                    $current->update(['is_active' => false, 'available_until' => now()]);
                }
                $plan->prices()->create([
                    'duration_months' => $row['duration_months'],
                    'amount_cents' => $amount,
                    'currency' => $currency,
                    'version' => ($current?->version ?? 0) + 1,
                    'is_active' => $row['is_active'] ?? true,
                    'available_from' => now(),
                ]);
            } elseif (array_key_exists('is_active', $row)) {
                $current->update(['is_active' => (bool) $row['is_active']]);
            }
        }
    }

    private function syncFeatures(Vista360Plan $plan, array $rows): void
    {
        $keys = [];
        foreach ($rows as $index => $row) {
            $keys[] = $row['feature_key'];
            $plan->features()->updateOrCreate(['feature_key' => $row['feature_key']], [
                'title' => $row['title'],
                'description' => $row['description'] ?? null,
                'value' => $row['value'] ?? null,
                'is_active' => $row['is_active'] ?? true,
                'sort_order' => $row['sort_order'] ?? $index,
            ]);
        }
        $plan->features()->whereNotIn('feature_key', $keys)->update(['is_active' => false]);
    }

    private function planPayload(Vista360Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'description' => $plan->description,
            'is_active' => $plan->is_active,
            'sort_order' => $plan->sort_order,
            'display_details' => $plan->display_details,
            'prices' => $plan->prices->map(fn ($price) => $price->only(['id', 'duration_months', 'amount_cents', 'currency', 'version', 'is_active', 'available_from', 'available_until']))->values(),
            'features' => $plan->features->map(fn ($feature) => $feature->only(['id', 'feature_key', 'title', 'description', 'value', 'is_active', 'sort_order']))->values(),
        ];
    }
}
