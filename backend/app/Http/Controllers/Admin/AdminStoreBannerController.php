<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\StoreBanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminStoreBannerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = StoreBanner::with(['store:id,name,slug,is_active,status']);

        if ($request->filled('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('is_approved')) {
            $approved = filter_var($request->is_approved, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($approved !== null) {
                $query->where('is_approved', $approved);
            }
        }

        if ($request->filled('position')) {
            $query->where('position', $request->position);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                    ->orWhereHas('store', function ($sq) use ($s) {
                        $sq->where('name', 'like', "%{$s}%");
                    });
            });
        }

        $banners = $query->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        $banners->getCollection()->transform(function (StoreBanner $banner) {
            $banner->setAttribute(
                'image_url',
                $banner->image ? Storage::disk('public')->url($banner->image) : null
            );

            return $banner;
        });

        return ResponseHelper::success($banners, 'Store banners retrieved successfully');
    }

    public function show(int $id): JsonResponse
    {
        $banner = StoreBanner::with(['store'])->findOrFail($id);
        $banner->setAttribute(
            'image_url',
            $banner->image ? Storage::disk('public')->url($banner->image) : null
        );

        return ResponseHelper::success($banner, 'Banner retrieved successfully');
    }

    public function approve(int $id): JsonResponse
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $banner = StoreBanner::findOrFail($id);
        $banner->update([
            'is_approved' => true,
            'rejection_reason' => null,
            'is_active' => true,
        ]);

        return ResponseHelper::success($banner->fresh(['store']), 'Banner approved');
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        $banner = StoreBanner::findOrFail($id);
        $banner->update([
            'is_approved' => false,
            'rejection_reason' => $request->reason,
            'is_active' => false,
        ]);

        return ResponseHelper::success($banner->fresh(['store']), 'Banner rejected');
    }

    public function toggleActive(int $id): JsonResponse
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $banner = StoreBanner::findOrFail($id);
        if (!$banner->is_approved) {
            return ResponseHelper::error('Approve this banner before activating it for shoppers.', null, 422);
        }
        $banner->is_active = !$banner->is_active;
        $banner->save();

        return ResponseHelper::success($banner->fresh(['store']), 'Banner visibility updated');
    }

    /**
     * Optional: remove a banner that violates policy (kept separate from category delete rules).
     */
    public function destroy(int $id): JsonResponse
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $banner = StoreBanner::findOrFail($id);
        if ($banner->image) {
            Storage::disk('public')->delete($banner->image);
        }
        $banner->delete();

        return ResponseHelper::success(null, 'Banner removed');
    }
}
