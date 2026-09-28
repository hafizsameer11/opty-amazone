<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only access to buyers, sellers and administrators.
 *
 * This is the closest thing the platform has to a "leads" register: every new
 * buyer or seller account is a registration, so role + created_at is the
 * authoritative lead signal (see CrmLeadsController for the referral funnel).
 */
class CrmUsersController extends CrmController
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'role' => 'nullable|in:buyer,seller,admin',
            'search' => 'nullable|string|max:120',
            'status' => 'nullable|in:active,blocked',
            'verified' => 'nullable|in:yes,no',
        ]);

        $window = $this->validateWindow($request);
        $paging = $this->validatePagination($request);

        $query = User::query()
            ->with('store:id,name,status,onboarding_status')
            ->withCount('orders')
            // Subqueries instead of per-row lookups: avoids an N+1 across the page.
            ->withCount(['orders as paid_orders_count' => fn ($q) => $q->where('payment_status', 'paid')])
            ->select('users.*')
            ->selectSub(
                Order::selectRaw('COALESCE(SUM(grand_total), 0)')
                    ->whereColumn('orders.user_id', 'users.id')
                    ->where('payment_status', 'paid'),
                'lifetime_value'
            )
            ->selectSub(Order::selectRaw('MAX(created_at)')->whereColumn('orders.user_id', 'users.id'), 'last_order_at')
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->where('role', $role))
            ->when(($filters['status'] ?? null) === 'blocked', fn ($q) => $q->where('is_blocked', true))
            ->when(($filters['status'] ?? null) === 'active', fn ($q) => $q->where('is_blocked', false))
            ->when(($filters['verified'] ?? null) === 'yes', fn ($q) => $q->whereNotNull('email_verified_at'))
            ->when(($filters['verified'] ?? null) === 'no', fn ($q) => $q->whereNull('email_verified_at'))
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            });

        $this->applyWindow($query, $window['from'], $window['to']);

        $paginator = $query
            ->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (User $user) => [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'phone' => $user->phone,
            'role' => (string) $user->role,
            'is_blocked' => (bool) $user->is_blocked,
            'email_verified' => $user->email_verified_at !== null,
            'phone_verified' => $user->phone_verified_at !== null,
            'store' => $user->store ? [
                'id' => (int) $user->store->id,
                'name' => (string) $user->store->name,
                'status' => (string) $user->store->status,
                'onboarding_status' => (string) $user->store->onboarding_status,
            ] : null,
            'orders_count' => (int) $user->orders_count,
            'paid_orders_count' => (int) $user->paid_orders_count,
            'lifetime_value' => round((float) $user->lifetime_value, 2),
            'created_at' => $user->created_at?->toISOString(),
            'last_order_at' => $user->last_order_at,
        ])->values();

        return $this->paginated(
            $paginator->setCollection($rows),
            ['summary' => $this->summary()],
            [
                'roles' => ['buyer', 'seller', 'admin'],
                'statuses' => ['active', 'blocked'],
            ]
        );
    }

    /**
     * Counts used to populate the Users / Buyers / Sellers tab headers without
     * a second request.
     *
     * @return array<string, int>
     */
    private function summary(): array
    {
        $buyers = User::where('role', 'buyer');
        $sellers = User::where('role', 'seller');

        return [
            'buyers' => (int) (clone $buyers)->count(),
            'sellers' => (int) (clone $sellers)->count(),
            'admins' => (int) User::where('role', 'admin')->count(),
            'buyers_blocked' => (int) (clone $buyers)->where('is_blocked', true)->count(),
            'sellers_blocked' => (int) (clone $sellers)->where('is_blocked', true)->count(),
            'new_this_month' => (int) User::whereIn('role', ['buyer', 'seller'])
                ->where('created_at', '>=', now()->startOfMonth())
                ->count(),
            'unverified_email' => (int) User::whereIn('role', ['buyer', 'seller'])
                ->whereNull('email_verified_at')
                ->count(),
        ];
    }
}
