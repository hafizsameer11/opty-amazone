<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\ProductPromotion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SellerPromotionController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $promotions = ProductPromotion::where('store_id', $store->id)
            ->with('product')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($promotions, 'Promotions retrieved successfully');
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'budget' => 'required|numeric|min:0',
            'duration_days' => 'required|integer|min:1',
            'target_audience' => 'nullable|array',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = \App\Models\Product::where('store_id', $store->id)
            ->findOrFail($request->product_id);

        $promotion = ProductPromotion::create([
            'store_id' => $store->id,
            'product_id' => $request->product_id,
            'budget' => $request->budget,
            'duration_days' => $request->duration_days,
            'start_date' => now(),
            'end_date' => now()->addDays($request->duration_days),
            'target_audience' => $request->target_audience,
            'status' => 'active',
        ]);

        return ResponseHelper::success($promotion->load('product'), 'Promotion created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);

        $promotion->update($request->only(['budget', 'target_audience', 'status']));

        return ResponseHelper::success($promotion->load('product'), 'Promotion updated successfully');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);
        $promotion->delete();

        return ResponseHelper::success(null, 'Promotion deleted successfully');
    }

    public function pause($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);
        $promotion->update(['status' => 'paused']);

        return ResponseHelper::success($promotion, 'Promotion paused');
    }

    public function resume($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);
        $promotion->update(['status' => 'active']);

        return ResponseHelper::success($promotion, 'Promotion resumed');
    }
}

