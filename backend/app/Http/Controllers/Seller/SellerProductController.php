<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SellerProductController extends Controller
{
    /**
     * Get all products for the authenticated seller's store.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $query = Product::where('store_id', $store->id)
            ->with(['category', 'subCategory']);

        // Filter by status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active === 'true' || $request->is_active === true);
        }

        // Filter by product type
        if ($request->has('product_type')) {
            $query->where('product_type', $request->product_type);
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

        $products = $query->paginate($request->get('per_page', 15));

        return ResponseHelper::success($products, 'Products retrieved successfully');
    }

    /**
     * Get product details.
     */
    public function show($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)
            ->with(['category', 'subCategory'])
            ->findOrFail($id);

        return ResponseHelper::success($product, 'Product retrieved successfully');
    }

    /**
     * Create a new product.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'sub_category_id' => 'nullable|exists:categories,id',
            'sku' => 'required|string|max:255|unique:products,sku',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'product_type' => 'required|in:frame,sunglasses,contact_lens,eye_hygiene,accessory',
            'price' => 'required|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'stock_status' => 'required|in:in_stock,out_of_stock,backorder',
            'images' => 'nullable|array',
            'images.*' => 'string|url',
            'frame_shape' => 'nullable|string|max:255',
            'frame_material' => 'nullable|string|max:255',
            'frame_color' => 'nullable|string|max:255',
            'gender' => 'nullable|in:men,women,unisex,kids',
            'lens_type' => 'nullable|string',
            'lens_index_options' => 'nullable|array',
            'treatment_options' => 'nullable|array',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
        ]);

        try {
            $validated['store_id'] = $store->id;
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
            
            // Ensure slug is unique
            while (Product::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
            }

            $product = Product::create($validated);

            return ResponseHelper::success(
                $product->load(['category', 'subCategory']),
                'Product created successfully'
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to create product: ' . $e->getMessage());
        }
    }

    /**
     * Update a product.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'sub_category_id' => 'nullable|exists:categories,id',
            'sku' => 'sometimes|string|max:255|unique:products,sku,' . $id,
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'product_type' => 'sometimes|in:frame,sunglasses,contact_lens,eye_hygiene,accessory',
            'price' => 'sometimes|numeric|min:0',
            'compare_at_price' => 'nullable|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'stock_status' => 'sometimes|in:in_stock,out_of_stock,backorder',
            'images' => 'nullable|array',
            'images.*' => 'string|url',
            'frame_shape' => 'nullable|string|max:255',
            'frame_material' => 'nullable|string|max:255',
            'frame_color' => 'nullable|string|max:255',
            'gender' => 'nullable|in:men,women,unisex,kids',
            'lens_type' => 'nullable|string',
            'lens_index_options' => 'nullable|array',
            'treatment_options' => 'nullable|array',
            'is_featured' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string|max:500',
            'meta_keywords' => 'nullable|string|max:255',
        ]);

        try {
            // Update slug if name changed
            if (isset($validated['name']) && $validated['name'] !== $product->name) {
                $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
                while (Product::where('slug', $validated['slug'])->where('id', '!=', $id)->exists()) {
                    $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(6);
                }
            }

            $product->update($validated);

            return ResponseHelper::success(
                $product->load(['category', 'subCategory']),
                'Product updated successfully'
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update product: ' . $e->getMessage());
        }
    }

    /**
     * Delete a product.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        try {
            $product->delete();

            return ResponseHelper::success(null, 'Product deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to delete product: ' . $e->getMessage());
        }
    }

    /**
     * Toggle product active status.
     */
    public function toggleStatus($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($id);

        try {
            $product->is_active = !$product->is_active;
            $product->save();

            return ResponseHelper::success(
                $product->load(['category', 'subCategory']),
                'Product status updated successfully'
            );
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to update product status: ' . $e->getMessage());
        }
    }

    /**
     * Get categories for product creation.
     */
    public function getCategories()
    {
        $categories = Category::where('is_active', true)
            ->whereNull('parent_id')
            ->with(['children' => function ($query) {
                $query->where('is_active', true);
            }])
            ->get();

        return ResponseHelper::success($categories, 'Categories retrieved successfully');
    }

    /**
     * Get all variants for a product.
     */
    public function getVariants($productId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($productId);

        $variants = $product->variants()->orderBy('sort_order')->orderBy('id')->get();

        return ResponseHelper::success($variants, 'Variants retrieved successfully');
    }

    /**
     * Create a new variant for a product.
     */
    public function createVariant(Request $request, $productId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)->findOrFail($productId);

        $validated = $request->validate([
            'color_name' => 'required|string|max:255',
            'color_code' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'images' => 'nullable|array',
            'images.*' => 'string|url',
            'price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'stock_status' => 'required|in:in_stock,out_of_stock,backorder',
            'is_default' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            // If this is set as default, unset other defaults
            if ($validated['is_default'] ?? false) {
                $product->variants()->update(['is_default' => false]);
            }

            $variant = $product->variants()->create($validated);

            DB::commit();

            return ResponseHelper::success($variant, 'Variant created successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to create variant: ' . $e->getMessage());
        }
    }

    /**
     * Update a variant.
     */
    public function updateVariant(Request $request, $variantId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $variant = ProductVariant::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($variantId);

        $validated = $request->validate([
            'color_name' => 'sometimes|string|max:255',
            'color_code' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'images' => 'nullable|array',
            'images.*' => 'string|url',
            'price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'stock_status' => 'sometimes|in:in_stock,out_of_stock,backorder',
            'is_default' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            // If this is set as default, unset other defaults
            if (isset($validated['is_default']) && $validated['is_default']) {
                $variant->product->variants()->where('id', '!=', $variantId)->update(['is_default' => false]);
            }

            $variant->update($validated);

            DB::commit();

            return ResponseHelper::success($variant, 'Variant updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to update variant: ' . $e->getMessage());
        }
    }

    /**
     * Delete a variant.
     */
    public function deleteVariant($variantId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $variant = ProductVariant::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($variantId);

        try {
            $variant->delete();

            return ResponseHelper::success(null, 'Variant deleted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to delete variant: ' . $e->getMessage());
        }
    }

    /**
     * Set a variant as default.
     */
    public function setDefaultVariant($variantId)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $variant = ProductVariant::whereHas('product', function ($query) use ($store) {
            $query->where('store_id', $store->id);
        })->findOrFail($variantId);

        try {
            DB::beginTransaction();

            // Unset all other defaults for this product
            $variant->product->variants()->update(['is_default' => false]);

            // Set this variant as default
            $variant->is_default = true;
            $variant->save();

            DB::commit();

            return ResponseHelper::success($variant, 'Default variant set successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to set default variant: ' . $e->getMessage());
        }
    }
}

