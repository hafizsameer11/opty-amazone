<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\Category;
use App\Services\Product\EyeHygieneVariantService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

class BuyerProductController extends Controller
{
    public function __construct(private EyeHygieneVariantService $eyeHygieneVariantService)
    {
    }

    private function productDetailRelations(): array
    {
        return [
            'store',
            'category',
            'subCategory',
            'variants',
            'frameSizes',
            'lensTypes',
            'lensCoatings',
            'sizeVolumeVariants',
            'eyeHygieneVariants',
        ];
    }

    private function prepareProductDetails(Product $product): Product
    {
        if ($product->product_type === 'eye_hygiene') {
            $this->eyeHygieneVariantService->ensureLegacySizeVolumes($product);
            $product->load(['sizeVolumeVariants', 'eyeHygieneVariants']);
        }

        return $product;
    }

    /**
     * Price range and price sorting are based on the current automatic campaign
     * quote, not a stale product column. Normal catalog queries stay paginated by
     * the database; only price-aware requests materialize their filtered result.
     */
    private function paginateWithCurrentPrices($query, Request $request, string $sortBy, string $sortOrder)
    {
        $perPage = min(100, max(1, (int) $request->get('per_page', 12)));
        $page = max(1, (int) $request->get('page', 1));
        $priceAware = $request->has('min_price') || $request->has('max_price') || $sortBy === 'price';
        $pricing = app(\App\Services\Campaigns\DiscountPricingService::class);
        $buyerId = $request->user('sanctum')?->id;

        if (!$priceAware) {
            return $query->orderBy($sortBy, $sortOrder)->paginate($perPage)
                ->through(fn ($product) => $pricing->product($product, $buyerId));
        }

        if ($sortBy !== 'price') {
            $query->orderBy($sortBy, $sortOrder);
        }
        $products = $query->get()->map(fn ($product) => $pricing->product($product, $buyerId));
        if ($request->filled('min_price')) {
            $products = $products->filter(fn ($product) => (float) $product['price'] >= (float) $request->min_price);
        }
        if ($request->filled('max_price')) {
            $products = $products->filter(fn ($product) => (float) $product['price'] <= (float) $request->max_price);
        }
        if ($sortBy === 'price') {
            $products = $products->sortBy('price', SORT_NUMERIC, $sortOrder === 'desc');
        }
        $products = $products->values();

        return new LengthAwarePaginator(
            $products->forPage($page, $perPage)->values(),
            $products->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );
    }
    /**
     * Get all products with filters.
     */
    public function getAll(Request $request)
    {
        $withRelations = ['store', 'category', 'subCategory', 'variants'];
        
        // Optionally include relationships if requested
        if ($request->has('include_relations') && $request->include_relations) {
            $withRelations = array_merge($withRelations, ['frameSizes', 'lensTypes', 'lensCoatings']);
        }
        
        $query = Product::with($withRelations)
            ->visibleToBuyers();

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

        // Filter by stock status
        if ($request->has('stock_status')) {
            $query->where('stock_status', $request->stock_status);
        }

        // Filter by minimum rating
        if ($request->has('min_rating')) {
            $query->where('rating', '>=', $request->min_rating);
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
        $sortBy = in_array($request->get('sort_by'), ['created_at', 'price', 'rating', 'name', 'view_count'], true) ? $request->get('sort_by') : 'created_at';
        $sortOrder = $request->get('sort_order') === 'asc' ? 'asc' : 'desc';
        $products = $this->paginateWithCurrentPrices($query, $request, $sortBy, $sortOrder);
        return ResponseHelper::success($products, 'Products retrieved successfully');
    }

    /**
     * Get product details.
     */
    public function getDetails($id)
    {
        $product = Product::with($this->productDetailRelations())
            ->visibleToBuyers()
            ->findOrFail($id);

        $this->prepareProductDetails($product);

        // Increment view count
        $product->increment('view_count');

        return ResponseHelper::success(app(\App\Services\Campaigns\DiscountPricingService::class)->product($product, request()->user('sanctum')?->id), 'Product retrieved successfully');
    }

    /**
     * Get products by category.
     */
    public function getByCategory($categorySlug, Request $request)
    {
        $category = Category::where('slug', $categorySlug)
            ->where('is_active', true)
            ->firstOrFail();

        $query = Product::with(['store', 'category', 'subCategory', 'variants'])
            ->visibleToBuyers()
            ->where(function ($q) use ($category) {
                $q->where('category_id', $category->id)
                  ->orWhere('sub_category_id', $category->id);
            });

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
        $sortBy = in_array($request->get('sort_by'), ['created_at', 'price', 'rating', 'name', 'view_count'], true) ? $request->get('sort_by') : 'created_at';
        $sortOrder = $request->get('sort_order') === 'asc' ? 'asc' : 'desc';
        $products = $this->paginateWithCurrentPrices($query, $request, $sortBy, $sortOrder);

        return ResponseHelper::success([
            'category' => $category,
            'products' => $products,
        ], 'Products retrieved successfully');
    }
}
