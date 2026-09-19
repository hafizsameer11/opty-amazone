<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Store\StoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SellerVerificationController extends Controller
{
    public function __construct(private StoreService $storeService)
    {
    }

    /** Step 1 — submit KYC / verification documents. */
    public function submit(Request $request): JsonResponse
    {
        // A store is created lazily for newly registered sellers. Resolving it
        // here keeps the registration -> verification flow reliable.
        $store = $this->storeService->getStore($request->user());

        $validated = $request->validate([
            'business_type' => 'required|string|max:100',
            'business_registration' => 'required|string|max:255',
            'tax_id' => 'nullable|string|max:64',
            'business_address' => 'required|string|max:1000',
            'website' => 'nullable|url|max:2048',
            'id_document_url' => 'nullable|string|max:2048',
        ]);

        $meta = is_array($store->meta) ? $store->meta : [];
        $meta['kyc'] = array_merge($meta['kyc'] ?? [], $validated);

        $updates = [
            'meta' => $meta,
            'onboarding_status' => 'pending_review',
            'status' => 'pending',
        ];
        // Keep legacy installations usable while the store setup migration is
        // being applied. New installations include both timestamp columns.
        if (Schema::hasColumn('stores', 'verification_submitted_at')) {
            $updates['verification_submitted_at'] = now();
        }
        $store->update($updates);

        return ResponseHelper::success([
            'store' => $store->fresh(),
        ], 'Verification submitted. An admin will review your account.');
    }

    /** Step 2 — mark store profile setup complete after seller finishes store edit wizard. */
    public function completeStoreSetup(Request $request): JsonResponse
    {
        // Resolve through StoreService so older accounts created before store
        // provisioning was added are repaired automatically.
        $store = $this->storeService->getStore($request->user());

        if (!$store->verification_submitted_at && $store->onboarding_status !== 'approved') {
            return ResponseHelper::error('Complete verification first.', null, 422);
        }

        $updates = [
            'onboarding_status' => $store->onboarding_status === 'approved' ? 'approved' : $store->onboarding_status,
        ];
        if (Schema::hasColumn('stores', 'store_setup_completed_at')) {
            $updates['store_setup_completed_at'] = now();
        }
        $store->update($updates);

        return ResponseHelper::success([
            'store' => $store->fresh(),
        ], 'Store setup marked complete.');
    }
}
