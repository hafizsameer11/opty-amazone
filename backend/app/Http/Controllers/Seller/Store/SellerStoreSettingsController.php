<?php

namespace App\Http\Controllers\Seller\Store;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\Store\UpdatePhoneVisibilityRequest;
use App\Http\Requests\Seller\Store\UpdateSettingsRequest;
use App\Http\Resources\StoreResource;
use App\Services\Store\StoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerStoreSettingsController extends Controller
{
    public function __construct(
        private StoreService $storeService
    ) {}

    /**
     * Get phone visibility setting.
     */
    public function getPhoneVisibility(Request $request): JsonResponse
    {
        try {
            $store = $this->storeService->getStore($request->user());

            return ResponseHelper::success([
                'phone_visibility' => $store->phone_visibility,
            ]);
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve phone visibility');
        }
    }

    /**
     * Update phone visibility.
     */
    public function updatePhoneVisibility(UpdatePhoneVisibilityRequest $request): JsonResponse
    {
        try {
            $store = $this->storeService->updatePhoneVisibility(
                $request->user(),
                $request->input('phone_visibility')
            );

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Phone visibility updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update phone visibility');
        }
    }

    /**
     * Get all store settings.
     */
    public function getSettings(Request $request): JsonResponse
    {
        try {
            $store = $this->storeService->getStore($request->user());

            return ResponseHelper::success([
                'settings' => [
                    'is_active' => $store->is_active,
                    'phone_visibility' => $store->phone_visibility,
                    'status' => $store->status,
                ],
            ]);
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve settings');
        }
    }

    /**
     * Update store settings.
     */
    public function updateSettings(UpdateSettingsRequest $request): JsonResponse
    {
        try {
            $store = $this->storeService->updateStore($request->user(), $request->validated());

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Settings updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update settings');
        }
    }
}
