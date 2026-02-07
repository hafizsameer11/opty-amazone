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
    public function index($productId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($productId);

        $frameSizes = $product->frameSizes()->orderBy('lens_width')->orderBy('bridge_width')->get();

        return ResponseHelper::success($frameSizes, 'Frame sizes retrieved successfully');
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
            'lens_width' => 'required|numeric|min:0|max:999.99',
            'bridge_width' => 'required|numeric|min:0|max:999.99',
            'temple_length' => 'required|numeric|min:0|max:999.99',
            'frame_width' => 'nullable|numeric|min:0|max:999.99',
            'frame_height' => 'nullable|numeric|min:0|max:999.99',
            'size_label' => 'nullable|string|max:50',
            'stock_quantity' => 'required|integer|min:0',
            'stock_status' => 'required|in:in_stock,out_of_stock,backorder',
        ]);

        try {
            $frameSize = $product->frameSizes()->create($validated);

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
            'lens_width' => 'sometimes|numeric|min:0|max:999.99',
            'bridge_width' => 'sometimes|numeric|min:0|max:999.99',
            'temple_length' => 'sometimes|numeric|min:0|max:999.99',
            'frame_width' => 'nullable|numeric|min:0|max:999.99',
            'frame_height' => 'nullable|numeric|min:0|max:999.99',
            'size_label' => 'nullable|string|max:50',
            'stock_quantity' => 'sometimes|integer|min:0',
            'stock_status' => 'sometimes|in:in_stock,out_of_stock,backorder',
        ]);

        try {
            $frameSize->update($validated);

            return ResponseHelper::success($frameSize, 'Frame size updated successfully');
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
            $frameSize->delete();

            return ResponseHelper::success(null, 'Frame size deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to delete frame size: ' . $e->getMessage());
        }
    }
}

