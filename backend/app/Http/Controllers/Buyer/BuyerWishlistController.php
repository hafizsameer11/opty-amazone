<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Buyer\WishlistService;
use Illuminate\Http\Request;

class BuyerWishlistController extends Controller
{
    public function __construct(private WishlistService $service) {}

    public function index(Request $request)
    {
        $page = $this->service->list($request->user(), min(100, max(1, (int) $request->query('per_page', 20))));
        $pricing = app(\App\Services\Campaigns\DiscountPricingService::class);
        $items = collect($page->items())->map(function ($item) use ($pricing, $request) {
            return ['id' => $item->id, 'created_at' => $item->created_at?->toISOString(), 'product' => $pricing->product($item->product, $request->user()->id)];
        });
        return ResponseHelper::success(['items' => $items, 'pagination' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()]]);
    }

    public function store(int $productId, Request $request)
    {
        $item = $this->service->save($request->user(), $productId);
        return ResponseHelper::success(['item' => $item->load('product')], 'Product saved', 201);
    }

    public function destroy(int $productId, Request $request)
    {
        $this->service->remove($request->user(), $productId);
        return ResponseHelper::success(null, 'Product removed from saved items');
    }

    public function status(int $productId, Request $request)
    {
        return ResponseHelper::success(['is_saved' => $this->service->contains($request->user(), $productId)]);
    }
}
