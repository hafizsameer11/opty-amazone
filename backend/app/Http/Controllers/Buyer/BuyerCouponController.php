<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Services\Campaigns\DiscountPricingService;
use App\Services\Coupon\CouponService;
use App\Services\Coupon\CouponValidationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BuyerCouponController extends Controller
{
    public function __construct(private CouponService $couponService, private DiscountPricingService $pricing) {}

    /** Quote against the authenticated buyer's persisted cart, never client totals. */
    public function validate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'code' => ['required', 'string', 'max:50'],
            'store_id' => ['nullable', 'integer'],
        ]);
        if ($validator->fails()) return ResponseHelper::validationError($validator->errors());

        return $this->quote($request, [
            $request->filled('store_id') ? (int) $request->store_id : '_single' => $request->code,
        ]);
    }

    public function quote(Request $request, ?array $codes = null): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'coupon_codes' => ['nullable', 'array'],
            'coupon_codes.*' => ['nullable', 'string', 'max:50'],
        ]);
        if ($codes === null && $validator->fails()) return ResponseHelper::validationError($validator->errors());

        $cart = Cart::where('user_id', $request->user()->id)->first();
        if (! $cart) return ResponseHelper::error('Cart is empty.', null, 422);

        try {
            $this->pricing->repriceCart($cart);
            $quote = $this->couponService->quoteCart($cart, $request->user(), $codes ?? (array) $request->input('coupon_codes', []));

            return ResponseHelper::success($this->publicQuote($quote), 'Coupon quote calculated successfully.');
        } catch (CouponValidationException $exception) {
            return ResponseHelper::error($exception->getMessage(), ['reason' => $exception->reason], 422);
        }
    }

    /**
     * Compatibility entry point for older Buyer clients.  New clients submit
     * the complete per-store map, while older ones still send one `code` and
     * an optional `store_id`.  Both paths deliberately end in the same
     * server-side cart quote; no client total is ever accepted.
     */
    public function apply(Request $request): JsonResponse
    {
        if ($request->has('coupon_codes')) {
            return $this->quote($request);
        }

        return $this->validate($request);
    }

    /** Removing a coupon is stateless; provide a new official quote with no codes. */
    public function remove(Request $request): JsonResponse
    {
        return $this->quote($request, []);
    }

    public function storeCoupons(Request $request, int $storeId): JsonResponse
    {
        Store::findOrFail($storeId);
        $coupons = $this->couponService->publicCouponsForStore($storeId, $request->user());
        return ResponseHelper::success($coupons->map(fn ($coupon) => $this->discoveryCard($coupon))->values(), 'Store coupons retrieved successfully.');
    }

    public function productCoupons(Request $request, int $productId): JsonResponse
    {
        $product = Product::findOrFail($productId);
        $coupons = $this->couponService->publicCouponsForStore($product->store_id, $request->user(), $product);
        return ResponseHelper::success($coupons->map(fn ($coupon) => $this->discoveryCard($coupon))->values(), 'Product coupons retrieved successfully.');
    }

    public function categoryCoupons(Request $request, int $categoryId): JsonResponse
    {
        $category = Category::findOrFail($categoryId);
        $stores = Product::query()->where(fn ($query) => $query->where('category_id', $category->id)->orWhere('sub_category_id', $category->id))
            ->distinct()->pluck('store_id');
        $coupons = $stores->flatMap(fn ($storeId) => $this->couponService->publicCouponsForStore((int) $storeId, $request->user())
            ->filter(fn ($coupon) => $coupon->scope === 'store' || $coupon->scope === 'categories' && $coupon->categories->contains('id', $category->id)));

        return ResponseHelper::success($coupons->map(fn ($coupon) => $this->discoveryCard($coupon))->values(), 'Category coupons retrieved successfully.');
    }

    private function publicQuote(array $quote): array
    {
        $stores = collect($quote['stores'])->map(function (array $store) {
            unset($store['_quote']);
            return $store;
        })->values()->all();

        // Array union (`+`) keeps the original associative `stores` value.
        // That JSON-encodes as an object keyed by store ID, but the Buyer
        // checkout consumes a list and calls `.find()`/`.map()` on it.  Merge
        // so the public response always replaces the internal map with a
        // sequential array.
        return array_merge($quote, ['stores' => $stores, 'breakdown' => $stores]);
    }

    private function discoveryCard($coupon): array
    {
        return [
            'id' => $coupon->id, 'store_id' => $coupon->store_id, 'code' => $coupon->code,
            'description' => $coupon->description, 'discount_type' => $coupon->discount_type,
            'discount_value' => $coupon->discount_value,
            'minimum_eligible_subtotal' => $coupon->min_order_amount, 'starts_at' => $coupon->starts_at,
            'ends_at' => $coupon->ends_at, 'scope' => $coupon->scope,
            'product_ids' => $coupon->products->pluck('id')->values(),
            'category_ids' => $coupon->categories->pluck('id')->values(),
            'variant_ids' => $coupon->variants->pluck('id')->values(),
        ];
    }
}
