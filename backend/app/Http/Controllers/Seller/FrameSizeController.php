<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\FrameSize;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class FrameSizeController extends Controller
{
    /**
     * Get all frame sizes for a product.
     */
    public function index(Request $request, $productId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($productId);

        $frameSizes = $product->frameSizes()
            ->whereNotNull('product_variant_id')
            ->orderBy('lens_width')
            ->orderBy('bridge_width');

        if ($request->has('variant_id')) {
            $variantId = $request->query('variant_id');
            if ($variantId === '' || $variantId === 'null') {
                return ResponseHelper::error('Sizes must belong to a color. Pass variant_id.', null, 422);
            }
            $variantId = (int) $variantId;
            $product->variants()->whereKey($variantId)->firstOrFail();
            $frameSizes->where('product_variant_id', $variantId);
        }

        return ResponseHelper::success($frameSizes->get(), 'Frame sizes retrieved successfully');
    }

    /**
     * Create a new frame size.
     */
    public function store(Request $request, $productId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($productId);

        $validated = $request->validate([
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'lens_width' => 'nullable|numeric|min:0|max:999.99',
            'bridge_width' => 'nullable|numeric|min:0|max:999.99',
            'temple_length' => 'nullable|numeric|min:0|max:999.99',
            'frame_width' => 'nullable|numeric|min:0|max:999.99',
            'frame_height' => 'nullable|numeric|min:0|max:999.99',
            'size_label' => 'required|string|max:100',
            'price' => 'nullable|numeric|min:0',
            'image' => 'nullable|string|max:2048',
            'stock_quantity' => 'required|integer|min:0',
            'stock_status' => 'required|in:in_stock,out_of_stock,backorder',
        ]);

        $validated['lens_width'] = $validated['lens_width'] ?? 0;
        $validated['bridge_width'] = $validated['bridge_width'] ?? 0;
        $validated['temple_length'] = $validated['temple_length'] ?? 0;

        $product->variants()->whereKey($validated['product_variant_id'])->firstOrFail();

        if (!empty($validated['image'])) {
            $validated['image'] = \App\Support\MediaUrl::absolute($validated['image']) ?? $validated['image'];
        }

        try {
            $frameSize = $product->frameSizes()->create($validated);
            \App\Models\ProductVariant::find($validated['product_variant_id'])?->syncStockFromSizes();

            return ResponseHelper::success($frameSize, 'Frame size created successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to create frame size: ' . $e->getMessage());
        }
    }

    /**
     * Update a frame size.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $frameSize = FrameSize::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($id);

        $validated = $request->validate([
            'product_variant_id' => 'sometimes|required|integer|exists:product_variants,id',
            'lens_width' => 'nullable|numeric|min:0|max:999.99',
            'bridge_width' => 'nullable|numeric|min:0|max:999.99',
            'temple_length' => 'nullable|numeric|min:0|max:999.99',
            'frame_width' => 'nullable|numeric|min:0|max:999.99',
            'frame_height' => 'nullable|numeric|min:0|max:999.99',
            'size_label' => 'sometimes|required|string|max:100',
            'price' => 'nullable|numeric|min:0',
            'image' => 'nullable|string|max:2048',
            'stock_quantity' => 'sometimes|integer|min:0',
            'stock_status' => 'sometimes|in:in_stock,out_of_stock,backorder',
        ]);

        if (array_key_exists('lens_width', $validated) && $validated['lens_width'] === null) {
            $validated['lens_width'] = 0;
        }
        if (array_key_exists('bridge_width', $validated) && $validated['bridge_width'] === null) {
            $validated['bridge_width'] = 0;
        }
        if (array_key_exists('temple_length', $validated) && $validated['temple_length'] === null) {
            $validated['temple_length'] = 0;
        }

        if (!empty($validated['product_variant_id'])) {
            $frameSize->product->variants()->whereKey($validated['product_variant_id'])->firstOrFail();
        }

        if (array_key_exists('image', $validated) && $validated['image']) {
            $validated['image'] = \App\Support\MediaUrl::absolute($validated['image']) ?? $validated['image'];
        }

        try {
            $frameSize->update($validated);
            $variantId = $frameSize->fresh()->product_variant_id;
            if ($variantId) {
                \App\Models\ProductVariant::find($variantId)?->syncStockFromSizes();
            }

            return ResponseHelper::success($frameSize->fresh(), 'Frame size updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update frame size: ' . $e->getMessage());
        }
    }

    /**
     * Delete a frame size.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $frameSize = FrameSize::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($id);

        try {
            $variantId = $frameSize->product_variant_id;
            $frameSize->delete();
            if ($variantId) {
                \App\Models\ProductVariant::find($variantId)?->syncStockFromSizes();
            }

            return ResponseHelper::success(null, 'Frame size deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to delete frame size: ' . $e->getMessage());
        }
    }
}

