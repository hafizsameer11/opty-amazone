<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\PublicStoreResource;
use App\Http\Resources\StoreReviewResource;
use App\Models\Store;
use App\Models\StoreReview;
use App\Services\Store\StoreReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class PublicStoreController extends Controller
{
    /** Whitelisted `sort` values for the public store list. */
    public const SORTS = ['rating_desc', 'rating_asc', 'name_asc', 'newest'];
    public function __construct(
        private StoreReviewService $reviewService
    ) {}

    /**
     * List all stores (public).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Store::where('status', 'active')
            ->where('is_active', true)
            ->with(['socialLinks' => fn ($links) => $links->where('is_active', true)]);

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        $this->applySort($query, (string) $request->query('sort', ''));

        $stores = $query->paginate($request->input('per_page', 15));

        return ResponseHelper::success([
            'stores' => PublicStoreResource::collection($stores->items()),
            'pagination' => [
                'current_page' => $stores->currentPage(),
                'last_page' => $stores->lastPage(),
                'per_page' => $stores->perPage(),
                'total' => $stores->total(),
            ],
        ]);
    }

/**
     * Whitelisted ordering for the public store list.
     *
     * `rating_desc`/`rating_asc` deliberately average the same verified reviews
     * that PublicStoreResource reports, so the order a store appears in always
     * matches the rating shown on its card. Unrated stores sink to the end
     * instead of being treated as 0.
     */
    private function applySort(Builder $query, string $sort): void
    {
        // Unknown values are ignored rather than rejected so existing callers
        // keep the default ordering.
        if (! in_array($sort, self::SORTS, true)) {
            return;
        }

        if (in_array($sort, ['rating_desc', 'rating_asc'], true)) {
            // A correlated subquery is portable across MySQL and SQLite, unlike
            // referencing a SELECT alias in ORDER BY. `toSql()` leaves a `?`
            // placeholder, so the bindings must be handed over explicitly or the
            // order-binding sequence is corrupted.
            $rating = StoreReview::query()
                ->selectRaw('AVG(rating)')
                ->whereColumn('store_reviews.store_id', 'stores.id')
                ->where('is_verified_purchase', true);

            $query
                ->orderByRaw(
                    'CASE WHEN ('.$rating->toSql().') IS NULL THEN 1 ELSE 0 END',
                    $rating->getBindings()
                )
                ->orderBy($rating, $sort === 'rating_desc' ? 'desc' : 'asc')
                ->orderByDesc('stores.id');

            return;
        }

        match ($sort) {
            'name_asc' => $query->orderBy('stores.name'),
            'newest' => $query->orderByDesc('stores.created_at'),
            default => null,
        };
    }

    /**
     * Get store details (public).
     */
    public function show(int $id): JsonResponse
    {
        $store = Store::where('status', 'active')
            ->where('is_active', true)
            ->with(['socialLinks' => fn ($links) => $links->where('is_active', true)])
            ->findOrFail($id);

        return ResponseHelper::success([
            'store' => new PublicStoreResource($store),
        ]);
    }

    /**
     * Get store reviews (public).
     */
    public function getStoreReviews(int $id, Request $request): JsonResponse
    {
        $reviews = $this->reviewService->getStoreReviews($id, array_merge($request->all(), ['verified' => true]));

        return ResponseHelper::success([
            'reviews' => StoreReviewResource::collection($reviews->items()),
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }
}
