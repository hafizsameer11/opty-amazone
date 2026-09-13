<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\ProductPromotion;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class SellerPromotionController extends Controller
{
    /**
     * Base list price for applying a percentage/fixed promotion (restores from compare_at when already on sale).
     */
    private function listPriceForPromotion(Product $product): float
    {
        $compare = $product->compare_at_price !== null ? (float) $product->compare_at_price : null;
        $price = (float) $product->price;

        if ($compare !== null && $compare > $price) {
            return $compare;
        }

        return $price;
    }

    private function applyDiscountToProduct(Product $product, string $discountType, $discountValue): void
    {
        if ($discountType === 'budget' || $discountValue === null || $discountValue === '') {
            return;
        }

        $listPrice = $this->listPriceForPromotion($product);
        $value = (float) $discountValue;

        if ($discountType === 'percentage') {
            $discountAmount = ($listPrice * $value) / 100;
            $product->compare_at_price = $listPrice;
            $product->price = max(0, $listPrice - $discountAmount);
        } elseif ($discountType === 'fixed') {
            $product->compare_at_price = $listPrice;
            $product->price = max(0, $listPrice - $value);
        }

        $product->save();
    }

    private function resolvePromotionEndDate(Request $request, Carbon $start): Carbon
    {
        if ($request->filled('end_date')) {
            return Carbon::parse($request->input('end_date'))->endOfDay();
        }

        $days = (int) $request->input('duration_days', 0);
        if ($days < 1) {
            $days = 7;
        }

        return $start->copy()->addDays($days)->endOfDay();
    }

    private function computeDurationDays(Carbon $start, Carbon $end): int
    {
        return max(1, (int) $start->copy()->startOfDay()->diffInDays($end->copy()->startOfDay()) + 1);
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $promotions = ProductPromotion::where('store_id', $store->id)
            ->with('product')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($promotions, 'Promotions retrieved successfully');
    }

    public function store(Request $request)
    {
        if ($request->input('discount_type') !== 'budget') {
            return ResponseHelper::error('Use /seller/discount-campaigns for automatic price discounts. Legacy product prices are preserved.', null, 410);
        }
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'discount_type' => 'required|in:budget,percentage,fixed',
            'budget' => ['nullable', 'numeric', 'min:0', Rule::requiredIf(fn () => $request->input('discount_type') === 'budget')],
            'discount_value' => ['nullable', 'numeric', 'min:0', Rule::requiredIf(fn () => in_array($request->input('discount_type'), ['percentage', 'fixed'], true))],
            'applies_to_price' => 'nullable|boolean',
            'duration_days' => 'nullable|integer|min:1',
            'end_date' => ['required', 'date'],
            'target_audience' => 'nullable|array',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $product = Product::where('store_id', $store->id)
            ->findOrFail($request->product_id);

        $start = Carbon::now();
        $end = $this->resolvePromotionEndDate($request, $start);
        if ($end->lt($start)) {
            return ResponseHelper::error('End date must be today or later', null, 422);
        }

        $durationDays = $this->computeDurationDays($start, $end);

        $appliesToPrice = $request->boolean(
            'applies_to_price',
            $request->input('discount_type') !== 'budget'
        );

        $promotion = ProductPromotion::create([
            'store_id' => $store->id,
            'product_id' => $request->product_id,
            'budget' => $request->discount_type === 'budget' ? (float) ($request->budget ?? 0) : 0,
            'discount_type' => $request->discount_type ?? 'budget',
            'discount_value' => $request->discount_value,
            'applies_to_price' => $appliesToPrice,
            'duration_days' => $durationDays,
            'start_date' => $start,
            'end_date' => $end,
            'target_audience' => $request->target_audience,
            'status' => 'active',
        ]);

        if ($appliesToPrice && $request->discount_type !== 'budget') {
            $product->refresh();
            $this->applyDiscountToProduct($product, $request->discount_type, $request->discount_value);
        }

        return ResponseHelper::success($promotion->load('product'), 'Promotion created successfully', 201);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $request->validate([
            'budget' => 'nullable|numeric|min:0',
            'discount_type' => 'sometimes|in:budget,percentage,fixed',
            'discount_value' => 'nullable|numeric|min:0',
            'applies_to_price' => 'nullable|boolean',
            'target_audience' => 'nullable|array',
            'status' => 'sometimes|in:active,paused,completed,cancelled',
            'end_date' => 'nullable|date',
            'duration_days' => 'nullable|integer|min:1',
        ]);

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);

        if ($promotion->discount_type !== 'budget' || $request->input('discount_type', 'budget') !== 'budget') {
            return ResponseHelper::error('Legacy price promotions are read-only. Use Discount Campaigns.', null, 410);
        }

        if ($request->filled('end_date')) {
            $end = Carbon::parse($request->input('end_date'))->endOfDay();
            $start = Carbon::parse($promotion->start_date);
            if ($end->lt($start->copy()->startOfDay())) {
                return ResponseHelper::error('End date cannot be before campaign start', null, 422);
            }
            $promotion->end_date = $end;
            $promotion->duration_days = $this->computeDurationDays($start, $end);
        } elseif ($request->filled('duration_days')) {
            $start = Carbon::parse($promotion->start_date);
            $promotion->end_date = $start->copy()->addDays((int) $request->duration_days)->endOfDay();
            $promotion->duration_days = (int) $request->duration_days;
        }

        $promotion->fill($request->only(['budget', 'discount_type', 'discount_value', 'applies_to_price', 'target_audience', 'status']));
        if ($promotion->discount_type === 'budget') {
            $promotion->discount_value = null;
        } else {
            $promotion->budget = 0;
        }
        $promotion->save();

        $shouldApplyPrice = $promotion->applies_to_price
            && $promotion->discount_type !== 'budget'
            && $promotion->discount_value !== null;

        if ($shouldApplyPrice) {
            $product = $promotion->product;
            if ($product) {
                $product->refresh();
                $this->applyDiscountToProduct($product, $promotion->discount_type, $promotion->discount_value);
            }
        }

        return ResponseHelper::success($promotion->fresh()->load('product'), 'Promotion updated successfully');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);
        $promotion->delete();

        return ResponseHelper::success(null, 'Promotion deleted successfully');
    }

    public function pause($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);
        $promotion->update(['status' => 'paused']);

        return ResponseHelper::success($promotion, 'Promotion paused');
    }

    public function resume($id)
    {
        $user = Auth::user();
        $store = $user->store;

        $promotion = ProductPromotion::where('store_id', $store->id)->findOrFail($id);
        $promotion->update(['status' => 'active']);

        return ResponseHelper::success($promotion, 'Promotion resumed');
    }
}
