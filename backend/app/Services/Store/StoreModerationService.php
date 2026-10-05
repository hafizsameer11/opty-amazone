<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\StoreReinstatementRequest;
use App\Models\User;
use App\Services\Email\MarketplaceEmailService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The single moderation boundary for reports, direct seller actions, and
 * reinstatement. It deliberately changes a store in place rather than deleting
 * financial/customer history, so an admin can audit and restore a store safely.
 */
class StoreModerationService
{
    public function __construct(private MarketplaceEmailService $emails) {}

    public function warn(Store $store, User $admin, string $reason, ?string $notes = null): Store
    {
        $store->loadMissing('user');
        $this->emails->storeWarning($store, $reason, $notes);

        return $store;
    }

    public function suspend(Store $input, User $admin, string $reason, ?string $notes = null): Store
    {
        return $this->hide($input, $admin, $reason, $notes, 'suspended_at', 'suspended_by');
    }

    /**
     * Disable a store that must keep its financial records (orders, payments,
     * wallet ledger, paid boosts). Buyers stop seeing the store and the seller
     * API is blocked exactly as for a suspension, but the audit trail records it
     * as a disable so the admin panel can tell an operational lock apart from a
     * report-driven suspension.
     */
    public function disable(Store $input, User $admin, string $reason, ?string $notes = null): Store
    {
        return $this->hide($input, $admin, $reason, $notes, 'disabled_at', 'disabled_by');
    }

    /**
     * Shared implementation for suspension and disabling: both take the store
     * out of circulation without deleting anything.
     */
    private function hide(Store $input, User $admin, string $reason, ?string $notes, string $atKey, string $byKey): Store
    {
        return DB::transaction(function () use ($input, $admin, $reason, $notes, $atKey, $byKey) {
            $store = Store::with('user')->lockForUpdate()->findOrFail($input->id);
            $meta = is_array($store->meta) ? $store->meta : [];
            $meta['moderation'] = array_filter([
                $atKey => now()->toIso8601String(),
                $byKey => $admin->id,
                'previous_status' => $store->status,
                'reason' => trim($reason),
                'notes' => $notes ? trim($notes) : null,
            ], static fn ($value) => $value !== null && $value !== '');

            $store->update([
                'status' => Store::STATUS_SUSPENDED,
                'is_active' => false,
                'meta' => $meta,
            ]);

            $this->emails->storeSuspended($store, $reason, $notes);

            return $store->fresh('user');
        });
    }

    /**
     * Removal is a reversible platform removal: buyer visibility and seller
     * operations stop, while reports, paid orders and audit records remain.
     */
    public function remove(Store $store, User $admin, string $reason, ?string $notes = null): Store
    {
        return DB::transaction(function () use ($store, $admin, $reason, $notes) {
            $removed = Store::with('user')->lockForUpdate()->findOrFail($store->id);
            $meta = is_array($removed->meta) ? $removed->meta : [];
            $meta['moderation'] = array_filter([
                'removed_at' => now()->toIso8601String(),
                'removed_by' => $admin->id,
                'reason' => trim($reason),
                'notes' => $notes ? trim($notes) : null,
            ], static fn ($value) => $value !== null && $value !== '');

            // `rejected` is an existing store status. It gives a removal its
            // own audited state without deleting paid-order data or making
            // foreign-key history impossible to investigate.
            $removed->update(['status' => 'rejected', 'is_active' => false, 'meta' => $meta]);
            $this->emails->storeRemoved($removed, $reason, $notes);

            return $removed->fresh('user');
        });
    }

    public function requestReinstatement(User $seller, string $reason): StoreReinstatementRequest
    {
        return DB::transaction(function () use ($seller, $reason) {
            $store = Store::where('user_id', $seller->id)->lockForUpdate()->first();
            if (! $store) {
                throw (new ModelNotFoundException())->setModel(Store::class);
            }
            if ($store->is_active || ! in_array($store->status, ['suspended', 'rejected'], true)) {
                throw ValidationException::withMessages([
                    'store' => ['Only an unavailable store can request reinstatement.'],
                ]);
            }

            $existing = StoreReinstatementRequest::where('store_id', $store->id)
                ->where('status', StoreReinstatementRequest::STATUS_PENDING)
                ->lockForUpdate()
                ->first();
            if ($existing) {
                throw ValidationException::withMessages([
                    'reason' => ['A reinstatement request is already awaiting review.'],
                ]);
            }

            return StoreReinstatementRequest::create([
                'store_id' => $store->id,
                'seller_id' => $seller->id,
                'reason' => trim($reason),
                'status' => StoreReinstatementRequest::STATUS_PENDING,
            ])->load(['store:id,name', 'seller:id,name,email']);
        });
    }

    public function decideReinstatement(StoreReinstatementRequest $input, User $admin, bool $approve, ?string $notes = null): StoreReinstatementRequest
    {
        return DB::transaction(function () use ($input, $admin, $approve, $notes) {
            $request = StoreReinstatementRequest::with(['store.user', 'seller'])->lockForUpdate()->findOrFail($input->id);
            if ($request->status !== StoreReinstatementRequest::STATUS_PENDING) {
                throw ValidationException::withMessages(['status' => ['This request has already been reviewed.']]);
            }

            $restoredStore = null;
            if ($approve) {
                $store = Store::lockForUpdate()->findOrFail($request->store_id);
                $meta = is_array($store->meta) ? $store->meta : [];
                unset($meta['moderation']['removed_at'], $meta['moderation']['removed_by']);
                $meta['moderation']['reinstated_at'] = now()->toIso8601String();
                $meta['moderation']['reinstated_by'] = $admin->id;
                $store->update([
                    'status' => 'active',
                    'is_active' => true,
                    'onboarding_status' => 'approved',
                    'meta' => $meta,
                ]);
                $restoredStore = $store->load('user');
            }

            $request->update([
                'status' => $approve ? StoreReinstatementRequest::STATUS_APPROVED : StoreReinstatementRequest::STATUS_REJECTED,
                'admin_notes' => $notes ? trim($notes) : null,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
            ]);

            if ($approve) {
                $this->emails->storeReinstated($restoredStore, $notes);
            }

            return $request->fresh(['store:id,name,status,is_active,user_id', 'seller:id,name,email', 'reviewer:id,name']);
        });
    }
}
