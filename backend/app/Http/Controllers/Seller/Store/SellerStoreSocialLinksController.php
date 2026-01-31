<?php

namespace App\Http\Controllers\Seller\Store;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\Store\StoreSocialLinkRequest;
use App\Http\Resources\StoreSocialLinkResource;
use App\Services\Store\StoreSocialLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerStoreSocialLinksController extends Controller
{
    public function __construct(
        private StoreSocialLinkService $socialLinkService
    ) {}

    /**
     * Get all social links.
     */
    public function index(Request $request): JsonResponse
    {
        $links = $this->socialLinkService->getSocialLinks($request->user());

        return ResponseHelper::success([
            'social_links' => StoreSocialLinkResource::collection($links),
        ]);
    }

    /**
     * Create a social link.
     */
    public function store(StoreSocialLinkRequest $request): JsonResponse
    {
        try {
            $link = $this->socialLinkService->createSocialLink($request->user(), $request->validated());

            return ResponseHelper::success([
                'social_link' => new StoreSocialLinkResource($link),
            ], 'Social link created successfully', 201);
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to create social link');
        }
    }

    /**
     * Update a social link.
     */
    public function update(int $id, StoreSocialLinkRequest $request): JsonResponse
    {
        try {
            $link = $this->socialLinkService->updateSocialLink($request->user(), $id, $request->validated());

            return ResponseHelper::success([
                'social_link' => new StoreSocialLinkResource($link),
            ], 'Social link updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update social link');
        }
    }

    /**
     * Delete a social link.
     */
    public function destroy(int $id, Request $request): JsonResponse
    {
        try {
            $this->socialLinkService->deleteSocialLink($request->user(), $id);

            return ResponseHelper::success(null, 'Social link deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to delete social link');
        }
    }

    /**
     * Toggle social link active status.
     */
    public function toggle(int $id, Request $request): JsonResponse
    {
        try {
            $link = $this->socialLinkService->toggleSocialLink($request->user(), $id);

            return ResponseHelper::success([
                'social_link' => new StoreSocialLinkResource($link),
            ], 'Social link status updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to toggle social link');
        }
    }
}
