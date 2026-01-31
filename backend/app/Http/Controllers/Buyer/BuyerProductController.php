<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;

class BuyerProductController extends Controller
{
    /**
     * Get all products with filters.
     */
    public function getAll(Request $request)
    {
        $query = Product::with(['store', 'category', 'subCategory'])
            ->where('is_active', true);

        // Filter by store
        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by sub category
        if ($request->has('sub_category_id')) {
            $query->where('sub_category_id', $request->sub_category_id);
        }

        // Filter by product type
        if ($request->has('product_type')) {
            $query->where('product_type', $request->product_type);
        }

        // Filter by price range
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        // Filter by frame shape
        if ($request->has('frame_shape')) {
            $query->where('frame_shape', $request->frame_shape);
        }

        // Filter by frame material
        if ($request->has('frame_material')) {
            $query->where('frame_material', $request->frame_material);
        }

        // Filter by gender
        if ($request->has('gender')) {
            $query->where('gender', $request->gender);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $products = $query->paginate($request->get('per_page', 12));

        return ResponseHelper::success($products, 'Products retrieved successfully');
    }

    /**
     * Get product details.
     */
    public function getDetails($id)
    {
        $product = Product::with(['store', 'category', 'subCategory'])
            ->where('is_active', true)
            ->findOrFail($id);

        // Increment view count
        $product->increment('view_count');

        return ResponseHelper::success($product, 'Product retrieved successfully');
    }

    /**
     * Get products by category.
     */
    public function getByCategory($categorySlug, Request $request)
    {
        $category = Category::where('slug', $categorySlug)
            ->where('is_active', true)
            ->firstOrFail();

        $query = Product::with(['store', 'category', 'subCategory'])
            ->where('is_active', true)
            ->where(function ($q) use ($category) {
                $q->where('category_id', $category->id)
                  ->orWhere('sub_category_id', $category->id);
            });

        // Apply filters
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        $products = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 12));

        return ResponseHelper::success([
            'category' => $category,
            'products' => $products,
        ], 'Products retrieved successfully');
    }
}

