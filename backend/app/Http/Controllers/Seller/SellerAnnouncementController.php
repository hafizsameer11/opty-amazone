<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\StoreAnnouncement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SellerAnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $announcements = StoreAnnouncement::where('store_id', $store->id)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($announcements, 'Announcements retrieved successfully');
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after:start_date',
            'is_active' => 'boolean',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $announcement = StoreAnnouncement::create([
            'store_id' => $store->id,
            'title' => $request->title,
            'message' => $request->message,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_active' => $request->is_active ?? true,
        ]);

        return ResponseHelper::success($announcement, 'Announcement created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        $announcement = StoreAnnouncement::where('store_id', $store->id)->findOrFail($id);

        $announcement->update($request->only(['title', 'message', 'start_date', 'end_date', 'is_active']));

        return ResponseHelper::success($announcement, 'Announcement updated successfully');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $announcement = StoreAnnouncement::where('store_id', $store->id)->findOrFail($id);
        $announcement->delete();

        return ResponseHelper::success(null, 'Announcement deleted successfully');
    }

    public function toggle($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $announcement = StoreAnnouncement::where('store_id', $store->id)->findOrFail($id);
        $announcement->update(['is_active' => !$announcement->is_active]);

        return ResponseHelper::success($announcement, 'Announcement status updated');
    }
}

