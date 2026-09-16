<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Buyer\Store\CreateReviewRequest;
use App\Http\Requests\Buyer\Store\UpdateReviewRequest;
use App\Http\Resources\ProductReviewResource;
use App\Http\Resources\StoreReviewResource;
use App\Models\{Product, ProductReview, Store, StoreReview};
use App\Services\Buyer\ReviewService;
use Illuminate\Http\Request;

class BuyerReviewController extends Controller
{
    public function __construct(private ReviewService $service) {}
    private function page($page, string $key, $resource): array { return [$key => $resource::collection($page->items()), 'pagination' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'per_page' => $page->perPage(), 'total' => $page->total()]]; }
    public function productIndex(int $id, Request $r) { $p = ProductReview::with('user')->where('product_id', $id)->latest()->paginate(min(100, max(1, $r->integer('per_page', 15)))); return ResponseHelper::success($this->page($p, 'reviews', ProductReviewResource::class)); }
    public function productStore(int $id, CreateReviewRequest $r) { $x = $this->service->createProduct($r->user(), Product::findOrFail($id), $r->validated()); return ResponseHelper::success(['review' => new ProductReviewResource($x)], 'Review created successfully', 201); }
    public function productUpdate(int $id, UpdateReviewRequest $r) { return ResponseHelper::success(['review' => new ProductReviewResource($this->service->updateProduct($r->user(), $id, $r->validated()))], 'Review updated successfully'); }
    public function productDestroy(int $id, Request $r) { $this->service->deleteProduct($r->user(), $id); return ResponseHelper::success(null, 'Review deleted successfully'); }
    public function storeIndex(int $id, Request $r) { $p = StoreReview::with('user')->where('store_id', $id)->latest()->paginate(min(100, max(1, $r->integer('per_page', 15)))); return ResponseHelper::success($this->page($p, 'reviews', StoreReviewResource::class)); }
    public function storeStore(int $id, CreateReviewRequest $r) { $x = $this->service->createStore($r->user(), Store::findOrFail($id), $r->validated()); return ResponseHelper::success(['review' => new StoreReviewResource($x)], 'Review created successfully', 201); }
    public function storeUpdate(int $id, UpdateReviewRequest $r) { return ResponseHelper::success(['review' => new StoreReviewResource($this->service->updateStore($r->user(), $id, $r->validated()))], 'Review updated successfully'); }
    public function storeDestroy(int $id, Request $r) { $this->service->deleteStore($r->user(), $id); return ResponseHelper::success(null, 'Review deleted successfully'); }
    public function history(Request $r) { $p = $this->service->history($r->user(), min(100, max(1, $r->integer('per_page', 20)))); return ResponseHelper::success(['reviews' => $p->items(), 'pagination' => ['current_page' => $p->currentPage(), 'last_page' => $p->lastPage(), 'per_page' => $p->perPage(), 'total' => $p->total()]]); }
}
