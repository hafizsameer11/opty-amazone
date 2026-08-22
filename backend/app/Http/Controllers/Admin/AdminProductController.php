<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProductController extends Controller
{
    /**
     * Get all products.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('store', 'category', 'subCategory');

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($products, 'Products retrieved successfully');
    }

    /**
     * Get product details.
     */
    public function show($id): JsonResponse
    {
        $product = Product::with([
            'store',
            'category',
            'subCategory',
            'variants',
            'frameSizes',
        ])->findOrFail($id);

        return ResponseHelper::success($product, 'Product retrieved successfully');
    }

    /**
     * Approve product.
     */
    public function approve($id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->update([
            'is_active' => true,
            'is_approved' => true,
        ]);

        return ResponseHelper::success($product->fresh(), 'Product approved successfully');
    }

    /**
     * Reject product.
     */
    public function reject(Request $request, $id): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string',
        ]);

        $product = Product::findOrFail($id);
        $product->update([
            'is_active' => false,
            'is_approved' => false,
            'rejection_reason' => $request->reason,
        ]);

        return ResponseHelper::success($product->fresh(), 'Product rejected successfully');
    }

    /**
     * Toggle active visibility.
     */
    public function toggleActive($id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->is_active = !$product->is_active;
        $product->save();

        return ResponseHelper::success(
            $product->fresh(),
            $product->is_active ? 'Product activated' : 'Product deactivated'
        );
    }

    /**
     * Toggle muted status (hidden from buyers).
     */
    public function toggleMute($id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->is_muted = !$product->is_muted;
        $product->save();

        return ResponseHelper::success(
            $product->fresh(),
            $product->is_muted ? 'Product muted' : 'Product unmuted'
        );
    }

    /**
     * Toggle boosted status.
     */
    public function toggleBoost($id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->is_boosted = !$product->is_boosted;
        $product->boosted_at = $product->is_boosted ? now() : null;
        if (!$product->is_boosted) {
            $product->boost_payment_status = null;
        }
        $product->save();

        return ResponseHelper::success(
            $product->fresh(),
            $product->is_boosted ? 'Product boosted' : 'Boost removed'
        );
    }

    /**
     * Approve pending boost payment.
     */
    public function approveBoost($id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->is_boosted = true;
        $product->boosted_at = now();
        $product->boost_payment_status = 'paid';
        $product->save();

        return ResponseHelper::success($product->fresh(), 'Boost approved');
    }

    /**
     * Delete product.
     */
    public function destroy($id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return ResponseHelper::success(null, 'Product deleted successfully');
    }
}
