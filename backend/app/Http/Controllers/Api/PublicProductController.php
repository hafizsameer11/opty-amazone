<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;

class PublicProductController extends Controller
{
    /**
     * Get all products (public).
     */
    public function index(Request $request)
    {
        $query = Product::with(['store', 'category'])
            ->where('is_active', true);

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 12));

        return ResponseHelper::success($products, 'Products retrieved successfully');
    }

    /**
     * Get product details (public).
     */
    public function show($id)
    {
        $product = Product::with(['store', 'category', 'subCategory'])
            ->where('is_active', true)
            ->findOrFail($id);

        $product->increment('view_count');

        return ResponseHelper::success($product, 'Product retrieved successfully');
    }
}

