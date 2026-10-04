<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\User;
use App\Notifications\SellerApprovedNotification;
use App\Services\Admin\AdminActivityLogger;
use App\Services\Email\MarketplaceEmailService;
use App\Services\Notifications\MarketplaceNotificationService;
use App\Services\Store\AdminStoreDeletionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSellerController extends Controller
{
    /**
     * Admin-facing lifecycle groups. `pending` covers both a brand-new
     * registration and a submitted verification, because the store stays
     * `status = pending` from signup until an admin decides.
     */
    private const FILTERS = [
        'pending' => [Store::STATUS_PENDING],
        'approved' => [Store::STATUS_ACTIVE],
        'rejected' => [Store::STATUS_REJECTED],
        'suspended' => [Store::STATUS_SUSPENDED],
    ];

    public function __construct(private AdminStoreDeletionService $deletion)
    {
    }

    /**
     * Stores list with a status filter and per-status counts for the tabs.
     */
    public function index(Request $request): JsonResponse
    {
        $status = (string) $request->query('status', 'all');
        if ($status !== 'all' && ! array_key_exists($status, self::FILTERS)) {
            return ResponseHelper::error('Unknown store status filter.', null, 422);
        }

        $query = Store::query()
            ->with('user:id,name,email,phone')
            ->withCount(['products', 'storeOrders'])
            ->when($status !== 'all', fn ($q) => $q->whereIn('status', self::FILTERS[$status]));

        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($userQuery) => $userQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%"));
            });
        }

        $page = $query->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at')
            ->paginate(min(100, max(1, $request->integer('per_page', 15))));

        return ResponseHelper::success([
            'stores' => collect($page->items())->map(fn (Store $store) => $this->serialize($store))->values(),
            'summary' => $this->statusCounts(),
            'filters' => array_keys(self::FILTERS),
            'statuses' => Store::STATUSES,
            'pagination' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
            ],
        ], 'Sellers retrieved successfully');
    }

    /**
     * Counts for every lifecycle group, used by the list tabs.
     *
     * @return array<string, int>
     */
    private function statusCounts(): array
    {
        $counts = ['all' => Store::query()->count()];
        foreach (self::FILTERS as $filter => $statuses) {
            $counts[$filter] = Store::query()->whereIn('status', $statuses)->count();
        }

        return $counts;
    }

    /**
     * Seller/store details, including the store's products and orders so the
     * admin can review everything without leaving the page.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $store = Store::with([
            'user:id,name,email,phone',
            'categories:id,name',
            'statistics',
            'socialLinks',
        ])->findOrFail($id);

        $products = Product::query()
            ->where('store_id', $store->id)
            ->orderByDesc('created_at')
            ->limit(25)
            ->get(['id', 'name', 'sku', 'price', 'is_active', 'is_approved', 'created_at']);

        $orders = StoreOrder::query()
            ->where('store_id', $store->id)
            ->orderByDesc('created_at')
            ->limit(25)
            ->get(['id', 'order_id', 'status', 'subtotal', 'delivery_fee', 'total', 'created_at']);

        $history = $this->deletion->financialHistory($store);

        return ResponseHelper::success([
            'store' => $this->serialize($store, detailed: true),
            'products' => $products,
            'orders' => $orders,
            'financial_history' => $history,
            'deletable' => $this->deletion->isDeletable($history),
        ], 'Seller retrieved successfully');
    }

    /**
     * Approve a pending (or previously rejected/suspended) store.
     */
    public function approve(Request $request, $id): JsonResponse
    {
        $store = Store::with('user')->findOrFail($id);

        if ($store->isApproved()) {
            return ResponseHelper::error('This store is already approved.', [
                'status' => ['This store is already approved.'],
            ], 422);
        }

        $previousStatus = $store->status;
        $meta = is_array($store->meta) ? $store->meta : [];
        unset($meta['rejection_reason'], $meta['rejected_at'], $meta['rejected_by']);
        $meta['approved_at'] = now()->toIso8601String();
        $meta['approved_by'] = $request->user()->id;

        $store->update([
            'status' => Store::STATUS_ACTIVE,
            'onboarding_status' => Store::ONBOARDING_APPROVED,
            // Approving must also un-hide the store: a store rejected or
            // suspended earlier still has is_active = false.
            'is_active' => true,
            'meta' => $meta,
        ]);

        if ($store->user) {
            $store->user->notify(new SellerApprovedNotification());
            app(MarketplaceEmailService::class)->sellerApproved($store->user);
        }

        AdminActivityLogger::log($request->user(), 'store.approved', 'store', (int) $store->id, true, [
            'from' => $previousStatus,
            'to' => Store::STATUS_ACTIVE,
        ], $request);

        return ResponseHelper::success($this->serialize($store->fresh()), 'Store approved successfully');
    }

    /**
     * Reject a pending (or previously approved) store registration.
     */
    public function reject(Request $request, $id): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:3', 'max:2000'],
        ]);

        $store = Store::with('user')->findOrFail($id);

        if ($store->isRejected()) {
            return ResponseHelper::error('This store is already rejected.', [
                'status' => ['This store is already rejected.'],
            ], 422);
        }

        $reason = trim($data['reason']);
        $meta = is_array($store->meta) ? $store->meta : [];
        $meta['rejection_reason'] = $reason;
        $meta['rejected_at'] = now()->toIso8601String();
        $meta['rejected_by'] = $request->user()->id;

        $store->update([
            'status' => Store::STATUS_REJECTED,
            'onboarding_status' => Store::ONBOARDING_REJECTED,
            'is_active' => false,
            'meta' => $meta,
        ]);

        if ($store->user) {
            app(MarketplaceNotificationService::class)->send(
                $store->user,
                'store.rejected',
                'Richiesta del tuo negozio non approvata',
                "La richiesta di approvazione del tuo negozio non è stata accettata. Motivo: {$reason}",
                '/auth/pending-approval',
                ['store_id' => $store->id]
            );
            app(MarketplaceEmailService::class)->sellerRejected($store, $reason);
        }

        AdminActivityLogger::log($request->user(), 'store.rejected', 'store', (int) $store->id, true, [
            'reason' => $reason,
        ], $request);

        return ResponseHelper::success($this->serialize($store->fresh()), 'Store rejected successfully');
    }

    /**
     * Permanently delete a store and all store-owned content.
     *
     * Refused when the store has financial history so payments, wallet ledger
     * and withdrawals are never destroyed.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $store = Store::with('user')->findOrFail($id);

        $removed = $this->deletion->delete($store, $request->user());

        if ($store->user) {
            app(MarketplaceNotificationService::class)->send(
                $store->user,
                'store.deleted',
                'Il tuo negozio è stato eliminato',
                'Il tuo negozio e tutti i suoi contenuti sono stati eliminati dall’amministrazione.',
                null,
                ['store_id' => $store->id]
            );
        }

        return ResponseHelper::success([
            'deleted_store' => ['id' => $store->id, 'name' => $store->name, 'slug' => $store->slug],
            'removed' => $removed,
        ], 'Store deleted successfully');
    }

    /**
     * @param  array<string, int|float>  $history
     */
    private function isDeletable(array $history): bool
    {
        return $this->deletion->isDeletable($history);
    }

    private function serialize(Store $store, bool $detailed = false): array
    {
        $data = [
            'id' => $store->id,
            'name' => $store->name,
            'slug' => $store->slug,
            'description' => $store->description,
            'email' => $store->email,
            'phone' => $store->phone,
            'logo' => $store->profile_image_url,
            'banner' => $store->banner_image_url,
            'theme_color' => $store->theme_color,
            'status' => $store->status,
            'onboarding_status' => $store->onboarding_status,
            'is_active' => (bool) $store->is_active,
            'rejection_reason' => $store->rejectionReason(),
            'products_count' => $store->products_count ?? $store->products()->count(),
            'orders_count' => $store->orders_count ?? $store->storeOrders()->count(),
            'created_at' => $store->created_at?->toIso8601String(),
        ];

        if ($detailed) {
            $data['user'] = $store->user ? [
                'id' => $store->user->id,
                'name' => $store->user->name,
                'email' => $store->user->email,
                'phone' => $store->user->phone,
            ] : null;
            $data['statistics'] = $store->statistics;
            $data['categories'] = $store->categories;
            $data['social_links'] = $store->socialLinks;
            $data['meta'] = $store->meta;
        } else {
            $data['user'] = $store->user ? [
                'id' => $store->user->id,
                'name' => $store->user->name,
                'email' => $store->user->email,
            ] : null;
        }

        return $data;
    }
}