<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Read-only seller/store view for the CRM.
 *
 * Per-seller revenue is taken from `store_orders.total`, never from
 * `orders.grand_total` — a buyer order fans out into one store_order per store,
 * so the basket total cannot be attributed to a single seller.
 */
class CrmSellersController extends CrmController
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:120',
            'status' => 'nullable|string|max:40',
            'onboarding_status' => 'nullable|string|max:40',
        ]);

        $window = $this->validateWindow($request);
        $paging = $this->validatePagination($request);

        $query = Store::query()
            ->with('user:id,name,email,is_blocked')
            ->select('stores.*')
            // Store has no products() relation, so the count is a subquery.
            ->selectSub(
                Product::selectRaw('COUNT(*)')->whereColumn('products.store_id', 'stores.id'),
                'products_count'
            )
            ->selectSub(StoreOrder::selectRaw('COUNT(*)')->whereColumn('store_orders.store_id', 'stores.id'), 'orders_count')
            ->selectSub(
                StoreOrder::selectRaw('COUNT(*)')
                    ->whereColumn('store_orders.store_id', 'stores.id')
                    ->where('store_orders.payment_status', 'paid'),
                'paid_orders_count'
            )
            ->selectSub(
                StoreOrder::selectRaw('COALESCE(SUM(total), 0)')
                    ->whereColumn('store_orders.store_id', 'stores.id')
                    ->where('store_orders.payment_status', 'paid'),
                'revenue'
            )
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($u) => $u
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['onboarding_status'] ?? null, fn ($q, $status) => $q->where('onboarding_status', $status));

        $this->applyWindow($query, $window['from'], $window['to']);

        $paginator = $query->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(function (Store $store) {
            return [
                'id' => (int) $store->id,
                'name' => (string) $store->name,
                'slug' => (string) $store->slug,
                'status' => (string) $store->status,
                'onboarding_status' => (string) $store->onboarding_status,
                'is_active' => (bool) $store->is_active,
                'onboarding_percent' => (int) $store->onboarding_percent,
                'owner' => $store->user ? [
                    'id' => (int) $store->user->id,
                    'name' => (string) $store->user->name,
                    'email' => (string) $store->user->email,
                    'is_blocked' => (bool) $store->user->is_blocked,
                ] : null,
                'products_count' => (int) $store->products_count,
                'orders_count' => (int) $store->orders_count,
                'paid_orders_count' => (int) $store->paid_orders_count,
                'revenue' => round((float) $store->revenue, 2),
                'currency' => 'EUR',
                'subscription' => $this->subscriptionFor($store),
                'created_at' => $store->created_at?->toISOString(),
            ];
        })->values();

        return $this->paginated(
            $paginator->setCollection($rows),
            ['summary' => $this->summary()],
            [
                'statuses' => ['pending', 'active', 'suspended', 'rejected'],
                'onboarding_statuses' => ['pending', 'in_progress', 'pending_review', 'approved', 'rejected'],
            ]
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    private function subscriptionFor(Store $store): ?array
    {
        if (! Schema::hasTable('subscriptions')) {
            return null;
        }

        $subscription = Subscription::where('store_id', $store->id)
            ->orderByDesc('id')
            ->first();

        if (! $subscription) {
            return null;
        }

        return [
            'id' => (int) $subscription->id,
            'status' => (string) $subscription->status,
            'plan' => $subscription->subscriptionPlan?->name,
            'billing_period' => $subscription->subscriptionPlan?->billing_period,
            'price' => $subscription->subscriptionPlan !== null
                ? round((float) $subscription->subscriptionPlan->price, 2)
                : null,
            'start_date' => $subscription->start_date?->toDateString(),
            'end_date' => $subscription->end_date?->toDateString(),
        ];
    }

    /** @return array<string, int|float> */
    private function summary(): array
    {
        $base = Store::query();

        return [
            'total_stores' => (int) (clone $base)->count(),
            'active' => (int) (clone $base)->where('status', 'active')->count(),
            'pending_review' => (int) (clone $base)->where('onboarding_status', 'pending_review')->count(),
            'suspended' => (int) (clone $base)->where('status', 'suspended')->count(),
            'rejected' => (int) (clone $base)->where('status', 'rejected')->count(),
            'new_this_month' => (int) (clone $base)->where('created_at', '>=', now()->startOfMonth())->count(),
            'total_revenue' => round((float) StoreOrder::where('payment_status', 'paid')->sum('total'), 2),
        ];
    }
}
