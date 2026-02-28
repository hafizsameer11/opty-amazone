<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\StoreBanner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PublicBannerController extends Controller
{
    /**
     * List active public banners for buyer frontend.
     */
    public function index(Request $request): JsonResponse
    {
        $position = $request->input('position');
        $allowedPositions = ['top', 'middle', 'bottom', 'sidebar'];

        $bannersQuery = StoreBanner::query()
            ->where('is_active', true)
            ->whereHas('store', function ($query) {
                $query->where('status', 'active')
                    ->where('is_active', true);
            })
            ->with(['store:id,name,slug']);

        if ($position && in_array($position, $allowedPositions, true)) {
            $bannersQuery->where('position', $position);
        }

        $banners = $bannersQuery
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->limit((int) $request->input('limit', 10))
            ->get()
            ->map(function (StoreBanner $banner) {
                return [
                    'id' => $banner->id,
                    'title' => $banner->title,
                    'link' => $banner->link,
                    'position' => $banner->position,
                    'sort_order' => $banner->sort_order,
                    'image' => $banner->image,
                    'image_url' => $banner->image ? Storage::url($banner->image) : null,
                    'store' => $banner->store ? [
                        'id' => $banner->store->id,
                        'name' => $banner->store->name,
                        'slug' => $banner->store->slug,
                    ] : null,
                ];
            });

        return ResponseHelper::success([
            'banners' => $banners,
        ], 'Banners retrieved successfully');
    }
}
