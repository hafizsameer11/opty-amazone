<?php

namespace App\Http\Controllers\Seller\Store;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\Store\UpdateStoreRequest;
use App\Http\Requests\Seller\Store\UpdateThemeRequest;
use App\Http\Requests\Seller\Store\UploadImageRequest;
use App\Http\Resources\StoreResource;
use App\Http\Resources\StoreStatisticResource;
use App\Services\Store\StoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Tag(
 *     name="Seller Store",
 *     description="Seller store management"
 * )
 */
class SellerStoreController extends Controller
{
    public function __construct(
        private StoreService $storeService
    ) {}

    /**
     * @OA\Get(
     *     path="/api/seller/store",
     *     summary="Get store overview",
     *     tags={"Seller Store"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Store retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", type="object", ref="#/components/schemas/Store")
     *         )
     *     )
     * )
     */
    public function getStore(Request $request): JsonResponse
    {
        try {
            $store = $this->storeService->getStore($request->user());

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ]);
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve store');
        }
    }

    /**
     * @OA\Put(
     *     path="/api/seller/store",
     *     summary="Update store profile",
     *     tags={"Seller Store"},
     *     security={{"sanctum": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="My Store"),
     *             @OA\Property(property="description", type="string", example="Store description"),
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="phone", type="string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Store updated successfully"
     *     )
     * )
     */
    public function updateStore(UpdateStoreRequest $request): JsonResponse
    {
        try {
            $store = $this->storeService->updateStore($request->user(), $request->validated());

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Store updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update store');
        }
    }

    /**
     * Upload profile image.
     */
    public function uploadProfileImage(UploadImageRequest $request): JsonResponse
    {
        try {
            $store = $this->storeService->uploadProfileImage($request->user(), $request->file('image'));

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Profile image uploaded successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to upload profile image');
        }
    }

    /**
     * Upload banner image.
     */
    public function uploadBannerImage(UploadImageRequest $request): JsonResponse
    {
        try {
            $store = $this->storeService->uploadBannerImage($request->user(), $request->file('image'));

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Banner image uploaded successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to upload banner image');
        }
    }

    /**
     * Delete profile image.
     */
    public function deleteProfileImage(Request $request): JsonResponse
    {
        try {
            $store = $this->storeService->deleteProfileImage($request->user());

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Profile image deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to delete profile image');
        }
    }

    /**
     * Delete banner image.
     */
    public function deleteBannerImage(Request $request): JsonResponse
    {
        try {
            $store = $this->storeService->deleteBannerImage($request->user());

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Banner image deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to delete banner image');
        }
    }

    /**
     * Update theme color.
     */
    public function updateTheme(UpdateThemeRequest $request): JsonResponse
    {
        try {
            $store = $this->storeService->updateTheme($request->user(), $request->input('theme_color'));

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ], 'Theme updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update theme');
        }
    }

    /**
     * Get store statistics.
     */
    public function getStatistics(Request $request): JsonResponse
    {
        $statistics = $this->storeService->getStoreStatistics($request->user());

        if (!$statistics) {
            return ResponseHelper::notFound('Statistics not found');
        }

        return ResponseHelper::success([
            'statistics' => new StoreStatisticResource($statistics),
        ]);
    }

    /**
     * Get store overview with all related data.
     */
    public function getOverview(Request $request): JsonResponse
    {
        try {
            // Ensure store exists
            $this->storeService->getStore($request->user());
            $store = $this->storeService->getStoreOverview($request->user());

            if (!$store) {
                return ResponseHelper::notFound('Store not found');
            }

            return ResponseHelper::success([
                'store' => new StoreResource($store),
            ]);
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve store overview');
        }
    }
}
