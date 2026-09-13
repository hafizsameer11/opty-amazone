<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\StoreBanner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class SellerBannerController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $banners = StoreBanner::where('store_id', $store->id)
            ->orderBy('sort_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return ResponseHelper::success($banners, 'Banners retrieved successfully');
    }

    public function store(Request $request)
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $request->merge([
            'is_active' => $request->has('is_active') ? $request->boolean('is_active') : null,
            'is_home_boosted' => $request->has('is_home_boosted') ? $request->boolean('is_home_boosted') : null,
        ]);

        $request->validate([
            'image' => 'required|image|max:5120',
            'title' => 'nullable|string|max:255',
            'link' => 'nullable|url',
            'position' => 'required|in:top,middle,bottom,sidebar',
            'is_active' => 'boolean',
            'is_home_boosted' => 'boolean',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        // Check banner permissions (based on subscription plan)
        // TODO: Implement permission check

        $imagePath = $request->file('image')->store("stores/{$store->id}/banners", 'public');

        $banner = StoreBanner::create([
            'store_id' => $store->id,
            'image' => $imagePath,
            'title' => $request->title,
            'link' => $request->link,
            'position' => $request->position,
            'is_active' => $request->is_active ?? true,
            'is_home_boosted' => $request->is_home_boosted ?? false,
            'is_approved' => false,
            'rejection_reason' => null,
            'sort_order' => StoreBanner::where('store_id', $store->id)->max('sort_order') + 1,
        ]);

        return ResponseHelper::success($banner, 'Banner uploaded successfully', 201);
    }

    public function update(Request $request, $id)
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        if ($request->has('is_active')) {
            $request->merge(['is_active' => $request->boolean('is_active')]);
        }
        if ($request->has('is_home_boosted')) {
            $request->merge(['is_home_boosted' => $request->boolean('is_home_boosted')]);
        }

        $user = Auth::user();
        $store = $user->store;

        $banner = StoreBanner::where('store_id', $store->id)->findOrFail($id);

        $data = $request->only(['title', 'link', 'position', 'is_active', 'is_home_boosted']);

        if ($request->hasFile('image')) {
            Storage::disk('public')->delete($banner->image);
            $data['image'] = $request->file('image')->store("stores/{$store->id}/banners", 'public');
        }

        $banner->update($data);

        return ResponseHelper::success($banner, 'Banner updated successfully');
    }

    public function destroy($id)
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $user = Auth::user();
        $store = $user->store;

        $banner = StoreBanner::where('store_id', $store->id)->findOrFail($id);
        
        Storage::disk('public')->delete($banner->image);
        $banner->delete();

        return ResponseHelper::success(null, 'Banner deleted successfully');
    }

    public function toggle($id)
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $user = Auth::user();
        $store = $user->store;

        $banner = StoreBanner::where('store_id', $store->id)->findOrFail($id);
        $banner->update(['is_active' => !$banner->is_active]);

        return ResponseHelper::success($banner, 'Banner status updated');
    }

    public function reorder(Request $request)
    {
        return \App\Helpers\ResponseHelper::error('Legacy banners are read-only. Use banner-campaigns.', null, 410);
        $request->validate([
            'banner_ids' => 'required|array',
            'banner_ids.*' => 'exists:store_banners,id',
        ]);

        $user = Auth::user();
        $store = $user->store;

        foreach ($request->banner_ids as $index => $bannerId) {
            StoreBanner::where('store_id', $store->id)
                ->where('id', $bannerId)
                ->update(['sort_order' => $index + 1]);
        }

        return ResponseHelper::success(null, 'Banners reordered successfully');
    }
}

