<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BuyerCartController extends Controller
{
    /**
     * Get user's cart.
     */
    public function index()
    {
        $user = Auth::user();
        $cart = Cart::where('user_id', $user->id)
            ->with(['items.product', 'items.store', 'items.variant'])
            ->first();

        if (!$cart) {
            $cart = Cart::create(['user_id' => $user->id]);
        }

        // Group items by store
        $itemsByStore = $cart->items()->with('product', 'store', 'variant')->get()->groupBy('store_id');
        $breakdown = [];

        foreach ($itemsByStore as $storeId => $items) {
            $store = $items->first()->store;
            $breakdown[] = [
                'store_id' => $storeId,
                'store_name' => $store->name,
                'items' => $items,
                'subtotal' => $items->sum(function ($item) {
                    return $item->price * $item->quantity;
                }),
            ];
        }

        return ResponseHelper::success([
            'cart' => $cart,
            'items' => $cart->items,
            'breakdown' => $breakdown,
            'total' => $cart->items->sum(function ($item) {
                return $item->price * $item->quantity;
            }),
        ], 'Cart retrieved successfully');
    }

    /**
     * Add item to cart.
     */
    public function addItem(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
            'product_variant' => 'nullable|array',
            'lens_configuration' => 'nullable|array',
            'prescription_data' => 'nullable|array',
        ]);

        $user = Auth::user();
        $product = Product::findOrFail($request->product_id);

        if (!$product->is_active || $product->stock_status === 'out_of_stock') {
            return ResponseHelper::error('Product is not available', null, 400);
        }

        $variant = null;
        $price = $product->price;
        $stockQuantity = $product->stock_quantity;
        $stockStatus = $product->stock_status;

        // If variant_id is provided, validate and use variant data
        if ($request->variant_id) {
            $variant = ProductVariant::where('product_id', $product->id)
                ->findOrFail($request->variant_id);
            
            $price = $variant->price ?? $product->price;
            $stockQuantity = $variant->stock_quantity;
            $stockStatus = $variant->stock_status;

            if ($stockStatus === 'out_of_stock') {
                return ResponseHelper::error('This color variant is out of stock', null, 400);
            }
        }

        if ($stockQuantity < $request->quantity) {
            return ResponseHelper::error('Insufficient stock', null, 400);
        }

        DB::beginTransaction();
        
        try {
            $cart = Cart::firstOrCreate(['user_id' => $user->id]);

            // Check if item already exists with same configuration
            $existingItem = $cart->items()
                ->where('product_id', $product->id)
                ->where('variant_id', $request->variant_id)
                ->where('lens_configuration', json_encode($request->lens_configuration ?? []))
                ->first();

            if ($existingItem) {
                // Update quantity
                $newQuantity = $existingItem->quantity + $request->quantity;
                if ($stockQuantity < $newQuantity) {
                    return ResponseHelper::error('Insufficient stock', null, 400);
                }
                $existingItem->update(['quantity' => $newQuantity]);
                $item = $existingItem;
            } else {
                // Create new item
                $item = CartItem::create([
                    'cart_id' => $cart->id,
                    'product_id' => $product->id,
                    'variant_id' => $request->variant_id,
                    'store_id' => $product->store_id,
                    'quantity' => $request->quantity,
                    'price' => $price,
                    'product_variant' => $request->product_variant,
                    'lens_configuration' => $request->lens_configuration,
                    'prescription_data' => $request->prescription_data,
                ]);
            }

            DB::commit();

            return ResponseHelper::success($item->load('product', 'store', 'variant'), 'Item added to cart');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Update cart item quantity.
     */
    public function updateItem(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $user = Auth::user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        
        $item = $cart->items()->findOrFail($id);
        $product = $item->product;

        if ($product->stock_quantity < $request->quantity) {
            return ResponseHelper::error('Insufficient stock', null, 400);
        }

        $item->update(['quantity' => $request->quantity]);

        return ResponseHelper::success($item->load('product', 'store'), 'Cart item updated');
    }

    /**
     * Remove item from cart.
     */
    public function removeItem($id)
    {
        $user = Auth::user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        
        $item = $cart->items()->findOrFail($id);
        $item->delete();

        return ResponseHelper::success(null, 'Item removed from cart');
    }

    /**
     * Clear cart.
     */
    public function clear()
    {
        $user = Auth::user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        
        $cart->items()->delete();

        return ResponseHelper::success(null, 'Cart cleared');
    }
}

