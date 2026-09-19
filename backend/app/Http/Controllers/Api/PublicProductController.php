<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\ProductReview;
use App\Http\Resources\ProductReviewResource;
use App\Models\Category;
use App\Services\Product\EyeHygieneVariantService;
use Illuminate\Http\Request;

class PublicProductController extends Controller
{
    public function __construct(private EyeHygieneVariantService $eyeHygieneVariantService)
    {
    }
    /**
     * Get all products (public).
     */
    public function index(Request $request)
    {
        $query = Product::with(['store', 'category'])
            ->visibleToBuyers();

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

        return ResponseHelper::success($products->through(fn ($p) => app(\App\Services\Campaigns\DiscountPricingService::class)->product($p, request()->user('sanctum')?->id)), 'Products retrieved successfully');
    }

    /**
     * Get product details (public).
     */
    public function show($id)
    {
        $product = Product::with([
            'store',
            'category',
            'subCategory',
            'variants',
            'frameSizes',
            'sizeVolumeVariants',
            'eyeHygieneVariants',
        ])
            ->visibleToBuyers()
            ->findOrFail($id);

        if ($product->product_type === 'eye_hygiene') {
            $this->eyeHygieneVariantService->ensureLegacySizeVolumes($product);
            $product->load(['sizeVolumeVariants', 'eyeHygieneVariants']);
        }

        $product->increment('view_count');
        $verifiedReviews = ProductReview::query()
            ->where('product_id', $product->id)
            ->where('is_verified_purchase', true);
        $product->setAttribute('rating', round((float) ((clone $verifiedReviews)->avg('rating') ?? 0), 2));
        $product->setAttribute('review_count', (clone $verifiedReviews)->count());

        return ResponseHelper::success(app(\App\Services\Campaigns\DiscountPricingService::class)->product($product, request()->user('sanctum')?->id), 'Product retrieved successfully');
    }

    public function reviews(int $id, Request $request)
    {
        Product::visibleToBuyers()->findOrFail($id);
        $reviews = ProductReview::with('user')
            ->where('product_id', $id)
            ->where('is_verified_purchase', true)
            ->latest()
            ->paginate(min(100, max(1, $request->integer('per_page', 15))));

        return ResponseHelper::success([
            'reviews' => ProductReviewResource::collection($reviews->items()),
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }
}
