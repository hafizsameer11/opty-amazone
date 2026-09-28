<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Models\Order;
use App\Models\ReferralClick;
use App\Models\ReferralConversion;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Derived "leads" register for the CRM.
 *
 * The platform has no dedicated leads entity — AdminLiveSummaryController
 * reports a hardcoded `leads => 0`. A lead here is therefore composed from the
 * two signals that actually exist:
 *
 *   1. registrations  — new buyer/seller accounts, derived from `users`
 *   2. referral funnel — clicks, attributions and conversions from the
 *                        referral tables, which is the only true top-of-funnel
 *                        tracking in the system
 *
 * Referral tables are guarded with Schema::hasTable() so this endpoint keeps
 * working on any environment where they have not been migrated yet.
 */
class CrmLeadsController extends CrmController
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'source' => 'nullable|in:registration,referral_click,referral_conversion,all',
            'search' => 'nullable|string|max:120',
            'role' => 'nullable|in:buyer,seller',
            'status' => 'nullable|in:all,unverified,verified,converted',
        ]);

        $window = $this->validateWindow($request);
        $paging = $this->validatePagination($request);
        $source = $filters['source'] ?? 'registration';

        $rows = match ($source) {
            'referral_click' => $this->referralClickLeads($filters, $window, $paging),
            'referral_conversion' => $this->referralConversions($window, $paging),
            default => $this->registrations($filters, $window, $paging),
        };

        return ResponseHelper::success([
            'rows' => $rows['rows'],
            'pagination' => $rows['pagination'],
            'summary' => $this->summary(),
            'filter_options' => [
                'sources' => ['registration', 'referral_click', 'referral_conversion'],
                'roles' => ['buyer', 'seller'],
                'statuses' => ['all', 'unverified', 'verified', 'converted'],
            ],
        ], 'Vista Express leads retrieved successfully.');
    }

    /**
     * New buyer/seller accounts. Each row is annotated with whether that person
     * has since placed a paid order, which is the conversion signal a sales
     * lead view needs.
     *
     * @return array{rows: \Illuminate\Support\Collection, pagination: array<string, mixed>}
     */
    private function registrations(array $filters, array $window, array $paging): array
    {
        $query = User::query()
            ->whereIn('role', ['buyer', 'seller'])
            ->select('users.*')
            ->selectSub(
                Order::selectRaw('COUNT(*)')->whereColumn('orders.user_id', 'users.id')
                    ->where('payment_status', 'paid'),
                'paid_orders'
            )
            ->selectSub(
                Order::selectRaw('COALESCE(SUM(grand_total), 0)')->whereColumn('orders.user_id', 'users.id')
                    ->where('payment_status', 'paid'),
                'lifetime_value'
            )
            ->selectSub(Order::selectRaw('MAX(created_at)')->whereColumn('orders.user_id', 'users.id'), 'last_order_at')
            ->when($filters['role'] ?? null, fn ($q, $role) => $q->where('role', $role))
            ->when(($filters['status'] ?? null) === 'unverified', fn ($q) => $q->whereNull('email_verified_at'))
            ->when(($filters['status'] ?? null) === 'verified', fn ($q) => $q->whereNotNull('email_verified_at'))
            ->when(($filters['status'] ?? null) === 'converted', fn ($q) => $q->whereHas(
                'orders',
                fn ($o) => $o->where('payment_status', 'paid')
            ))
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            });

        $this->applyWindow($query, $window['from'], $window['to']);

        $paginator = $query->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (User $user) => [
            'id' => (int) $user->id,
            'source' => 'registration',
            'name' => (string) $user->name,
            'email' => (string) $user->email,
            'phone' => $user->phone,
            'role' => (string) $user->role,
            'is_blocked' => (bool) $user->is_blocked,
            'email_verified' => $user->email_verified_at !== null,
            'phone_verified' => $user->phone_verified_at !== null,
            'status' => $this->leadStatus($user),
            'converted' => (int) $user->paid_orders > 0,
            'paid_orders' => (int) $user->paid_orders,
            'lifetime_value' => round((float) $user->lifetime_value, 2),
            'currency' => 'EUR',
            'created_at' => $user->created_at?->toISOString(),
            'last_order_at' => $user->last_order_at,
        ])->values();

        return [
            'rows' => $rows,
            'pagination' => $this->paginationMeta($paginator),
        ];
    }

    /**
     * Referral clicks are the rawest top-of-funnel signal available. Only
     * hashed identifiers are stored upstream, so nothing identifying is
     * returned here.
     *
     * @return array{rows: \Illuminate\Support\Collection, pagination: array<string, mixed>}
     */
    private function referralClickLeads(array $filters, array $window, array $paging): array
    {
        if (! Schema::hasTable('referral_clicks')) {
            return ['rows' => collect(), 'pagination' => $this->emptyPagination()];
        }

        $query = ReferralClick::query()
            ->with('referrer:id,name')
            ->with('code:id,code')
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where('attribution_token', 'like', "%{$search}%");
            });

        $this->applyWindow($query, $window['from'], $window['to'], 'clicked_at');

        $paginator = $query->orderByDesc('clicked_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (ReferralClick $click) => [
            'id' => (int) $click->getKey(),
            'source' => 'referral_click',
            'name' => $click->referrer?->name,
            'email' => null,
            'phone' => null,
            'role' => null,
            'token_prefix' => substr((string) $click->attribution_token, 0, 8),
            'referrer' => $click->referrer?->name,
            'referral_code' => $click->code?->code,
            'status' => 'clicked',
            'converted' => false,
            'currency' => 'EUR',
            'created_at' => $click->clicked_at?->toISOString(),
            'last_order_at' => null,
        ])->values();

        return ['rows' => $rows, 'pagination' => $this->paginationMeta($paginator)];
    }

    /**
     * @return array{rows: \Illuminate\Support\Collection, pagination: array<string, mixed>}
     */
    private function referralConversions(array $window, array $paging): array
    {
        if (! Schema::hasTable('referral_conversions')) {
            return ['rows' => collect(), 'pagination' => $this->emptyPagination()];
        }

        $query = ReferralConversion::query()
            ->with('referred:id,name,email,phone,role')
            ->with('referrer:id,name')
            ->with('campaign:id,name');

        $this->applyWindow($query, $window['from'], $window['to'], 'registered_at');

        $paginator = $query->orderByDesc('registered_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (ReferralConversion $conversion) => [
            'id' => (int) $conversion->getKey(),
            'source' => 'referral_conversion',
            'name' => $conversion->referred?->name,
            'email' => $conversion->referred?->email,
            'phone' => $conversion->referred?->phone,
            'role' => $conversion->referred?->role,
            'referrer' => $conversion->referrer?->name,
            'campaign' => $conversion->campaign?->name,
            'status' => $conversion->first_qualifying_order_at ? 'converted' : 'registered',
            'converted' => $conversion->first_qualifying_order_at !== null,
            'currency' => 'EUR',
            'created_at' => $conversion->registered_at?->toISOString(),
            'last_order_at' => $conversion->first_qualifying_order_at?->toISOString(),
        ])->values();

        return ['rows' => $rows, 'pagination' => $this->paginationMeta($paginator)];
    }

    private function leadStatus(User $user): string
    {
        if ((int) ($user->paid_orders ?? 0) > 0) {
            return 'converted';
        }

        return $user->email_verified_at !== null ? 'verified' : 'unverified';
    }

    /** @return array<string, mixed> */
    private function summary(): array
    {
        $newBuyers = User::where('role', 'buyer')->where('created_at', '>=', now()->startOfMonth())->count();
        $newSellers = User::where('role', 'seller')->where('created_at', '>=', now()->startOfMonth())->count();
        $totalBuyers = User::where('role', 'buyer')->count();
        $totalSellers = User::where('role', 'seller')->count();

        $summary = [
            'total_buyers' => (int) $totalBuyers,
            'total_sellers' => (int) $totalSellers,
            'new_buyers_this_month' => (int) $newBuyers,
            'new_sellers_this_month' => (int) $newSellers,
            'unverified' => (int) User::whereIn('role', ['buyer', 'seller'])->whereNull('email_verified_at')->count(),
            'buyer_conversion_rate' => $totalBuyers > 0
                ? round($this->payingBuyers() / $totalBuyers * 100, 1)
                : 0.0,
            'referral_clicks' => Schema::hasTable('referral_clicks') ? (int) ReferralClick::count() : null,
            'referral_clicks_this_month' => Schema::hasTable('referral_clicks')
                ? (int) ReferralClick::where('clicked_at', '>=', now()->startOfMonth())->count()
                : null,
            'referral_conversions' => Schema::hasTable('referral_conversions') ? (int) ReferralConversion::count() : null,
        ];

        return $summary;
    }

    private function payingBuyers(): int
    {
        return (int) Order::where('payment_status', 'paid')
            ->whereIn('user_id', User::where('role', 'buyer')->select('id'))
            ->distinct()
            ->count('user_id');
    }

    /** @return array<string, mixed> */
    private function paginationMeta($paginator): array
    {
        return [
            'page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }

    /** @return array<string, mixed> */
    private function emptyPagination(): array
    {
        return ['page' => 1, 'per_page' => 0, 'total' => 0, 'last_page' => 1, 'from' => null, 'to' => null];
    }
}
