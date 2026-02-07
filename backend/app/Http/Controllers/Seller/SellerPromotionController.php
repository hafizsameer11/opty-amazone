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
            'budget' => 'nullable|numeric|min:0',
            'discount_type' => 'required|in:budget,percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
            'applies_to_price' => 'nullable|boolean',
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
            'budget' => $request->budget ?? 0,
            'discount_type' => $request->discount_type ?? 'budget',
            'discount_value' => $request->discount_value,
            'applies_to_price' => $request->applies_to_price ?? false,
            'duration_days' => $request->duration_days,
            'start_date' => now(),
            'end_date' => now()->addDays($request->duration_days),
            'target_audience' => $request->target_audience,
            'status' => 'active',
        ]);

        // If promotion applies discount to price, update product compare_at_price
        if ($request->applies_to_price && $request->discount_value && $request->discount_type !== 'budget') {
            $product = \App\Models\Product::find($request->product_id);
            if ($product) {
                $currentPrice = $product->price;
                if ($request->discount_type === 'percentage') {
                    $discountAmount = ($currentPrice * $request->discount_value) / 100;
                    $product->compare_at_price = $currentPrice;
                    $product->price = $currentPrice - $discountAmount;
                } elseif ($request->discount_type === 'fixed') {
                    $product->compare_at_price = $currentPrice;
                    $product->price = max(0, $currentPrice - $request->discount_value);
                }
                $product->save();
            }
        }

        return ResponseHelper::success($promotion->load('product'), 'Promotion created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        $request->validate([
            'budget' => 'nullable|numeric|min:0',
            'discount_type' => 'sometimes|in:budget,percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
            'applies_to_price' => 'nullable|boolean',
            'target_audience' => 'nullable|array',
            'status' => 'sometimes|in:active,paused,completed,cancelled',
        ]);

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);

        $updateData = $request->only(['budget', 'discount_type', 'discount_value', 'applies_to_price', 'target_audience', 'status']);
        $promotion->update($updateData);

        // If promotion applies discount to price, update product compare_at_price
        if ($request->applies_to_price && $request->discount_value && $request->discount_type !== 'budget') {
            $product = $promotion->product;
            if ($product) {
                $currentPrice = $product->price;
                if ($request->discount_type === 'percentage') {
                    $discountAmount = ($currentPrice * $request->discount_value) / 100;
                    $product->compare_at_price = $currentPrice;
                    $product->price = $currentPrice - $discountAmount;
                } elseif ($request->discount_type === 'fixed') {
                    $product->compare_at_price = $currentPrice;
                    $product->price = max(0, $currentPrice - $request->discount_value);
                }
                $product->save();
            }
        }

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

