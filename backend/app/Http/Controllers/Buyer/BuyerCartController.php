<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductSizeVolume;
use App\Models\EyeHygieneVariant;
use App\Models\FrameSize;
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
            // Frame size and prescription
            'frame_size_id' => 'nullable|exists:frame_sizes,id',
            'prescription_id' => 'nullable|exists:prescriptions,id',
            // Lens customization
            'lens_index' => 'nullable|numeric|min:0|max:10',
            'lens_type' => 'nullable|string|max:50',
            'lens_thickness_material_id' => 'nullable|exists:lens_thickness_materials,id',
            'lens_thickness_option_id' => 'nullable|exists:lens_thickness_options,id',
            'treatment_ids' => 'nullable|array',
            'treatment_ids.*' => 'integer|exists:lens_treatments,id',
            'lens_coatings' => 'nullable|string',
            'lens_color_id' => 'nullable|integer',
            // Contact lens fields
            'contact_lens_left_base_curve' => 'nullable|numeric|min:0|max:20',
            'contact_lens_left_diameter' => 'nullable|numeric|min:0|max:20',
            'contact_lens_left_power' => 'nullable|numeric|min:-30|max:30',
            'contact_lens_left_qty' => 'nullable|integer|min:0',
            'contact_lens_left_cylinder' => 'nullable|numeric|min:-10|max:10',
            'contact_lens_left_axis' => 'nullable|integer|min:0|max:180',
            'contact_lens_right_base_curve' => 'nullable|numeric|min:0|max:20',
            'contact_lens_right_diameter' => 'nullable|numeric|min:0|max:20',
            'contact_lens_right_power' => 'nullable|numeric|min:-30|max:30',
            'contact_lens_right_qty' => 'nullable|integer|min:0',
            'contact_lens_right_cylinder' => 'nullable|numeric|min:-10|max:10',
            'contact_lens_right_axis' => 'nullable|integer|min:0|max:180',
            'contact_lens_pack_quantity' => 'nullable|integer|min:1',
            'product_size_volume_id' => 'nullable|exists:product_size_volumes,id',
            'eye_hygiene_variant_id' => 'nullable|exists:eye_hygiene_variants,id',
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

        if ($request->contact_lens_pack_quantity) {
            $packPrice = $this->resolveContactLensPackPrice(
                $product,
                (int) $request->contact_lens_pack_quantity
            );
            if ($packPrice === null) {
                return ResponseHelper::error('Invalid contact lens pack size', null, 422);
            }
            $price = $packPrice;
        }

        if ($request->product_size_volume_id) {
            $sizeVolume = ProductSizeVolume::where('product_id', $product->id)
                ->where('id', $request->product_size_volume_id)
                ->where('is_active', true)
                ->firstOrFail();

            $price = $sizeVolume->price ?? $product->price;
            $stockQuantity = (int) $sizeVolume->stock_quantity;
            $stockStatus = $sizeVolume->stock_status ?? $product->stock_status;

            if ($stockStatus === 'out_of_stock') {
                return ResponseHelper::error('This size/volume option is out of stock', null, 400);
            }
        }

        if ($request->eye_hygiene_variant_id) {
            $namedVariant = EyeHygieneVariant::where('product_id', $product->id)
                ->where('id', $request->eye_hygiene_variant_id)
                ->where('is_active', true)
                ->firstOrFail();

            $price = $namedVariant->price ?? $product->price;
            $stockQuantity = $product->stock_quantity;
            $stockStatus = $product->stock_status;
        }

        // Prefer size-level stock when a frame size is selected (Color → Size → Stock)
        if ($request->frame_size_id) {
            $frameSize = FrameSize::where('product_id', $product->id)
                ->where('id', $request->frame_size_id)
                ->firstOrFail();

            if ($request->variant_id && (int) $frameSize->product_variant_id !== (int) $request->variant_id) {
                return ResponseHelper::error('Selected size does not belong to this color', null, 422);
            }

            $price = $frameSize->price ?? $price;
            $stockQuantity = (int) $frameSize->stock_quantity;
            $stockStatus = $frameSize->stock_status ?? $stockStatus;

            if ($stockStatus === 'out_of_stock' || $stockQuantity <= 0) {
                return ResponseHelper::error('This size is out of stock', null, 400);
            }
        }

        if ($stockQuantity < $request->quantity) {
            return ResponseHelper::error('Insufficient stock', null, 400);
        }

        DB::beginTransaction();
        
        try {
            $cart = Cart::firstOrCreate(['user_id' => $user->id]);

            // Check if item already exists with same configuration
            // Consider variant_id, frame_size_id, prescription_id, and lens customization
            $existingItemQuery = $cart->items()
                ->where('product_id', $product->id)
                ->where('variant_id', $request->variant_id ?? null)
                ->where('frame_size_id', $request->frame_size_id ?? null)
                ->where('prescription_id', $request->prescription_id ?? null)
                ->where('lens_index', $request->lens_index ?? null)
                ->where('lens_type', $request->lens_type ?? null)
                ->where('lens_thickness_material_id', $request->lens_thickness_material_id ?? null)
                ->where('lens_thickness_option_id', $request->lens_thickness_option_id ?? null)
                ->where('lens_color_id', $request->lens_color_id ?? null)
                ->where('contact_lens_pack_quantity', $request->contact_lens_pack_quantity ?? null)
                ->where('product_size_volume_id', $request->product_size_volume_id ?? null)
                ->where('eye_hygiene_variant_id', $request->eye_hygiene_variant_id ?? null);

            $existingItem = $existingItemQuery->first();

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
                $itemData = [
                    'cart_id' => $cart->id,
                    'product_id' => $product->id,
                    'variant_id' => $request->variant_id,
                    'store_id' => $product->store_id,
                    'quantity' => $request->quantity,
                    'price' => $price,
                    'product_variant' => $request->product_variant,
                    'lens_configuration' => $request->lens_configuration,
                    'prescription_data' => $request->prescription_data,
                    // New specific fields
                    'frame_size_id' => $request->frame_size_id,
                    'prescription_id' => $request->prescription_id,
                    'lens_index' => $request->lens_index,
                    'lens_type' => $request->lens_type,
                    'lens_thickness_material_id' => $request->lens_thickness_material_id,
                    'lens_thickness_option_id' => $request->lens_thickness_option_id,
                    'treatment_ids' => $request->treatment_ids,
                    'lens_coatings' => $request->lens_coatings,
                    'lens_color_id' => $request->lens_color_id,
                    // Contact lens fields
                    'contact_lens_left_base_curve' => $request->contact_lens_left_base_curve,
                    'contact_lens_left_diameter' => $request->contact_lens_left_diameter,
                    'contact_lens_left_power' => $request->contact_lens_left_power,
                    'contact_lens_left_qty' => $request->contact_lens_left_qty,
                    'contact_lens_left_cylinder' => $request->contact_lens_left_cylinder,
                    'contact_lens_left_axis' => $request->contact_lens_left_axis,
                    'contact_lens_right_base_curve' => $request->contact_lens_right_base_curve,
                    'contact_lens_right_diameter' => $request->contact_lens_right_diameter,
                    'contact_lens_right_power' => $request->contact_lens_right_power,
                    'contact_lens_right_qty' => $request->contact_lens_right_qty,
                    'contact_lens_right_cylinder' => $request->contact_lens_right_cylinder,
                    'contact_lens_right_axis' => $request->contact_lens_right_axis,
                    'contact_lens_pack_quantity' => $request->contact_lens_pack_quantity,
                    'product_size_volume_id' => $request->product_size_volume_id,
                    'eye_hygiene_variant_id' => $request->eye_hygiene_variant_id,
                ];

                $item = CartItem::create($itemData);
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

    private function resolveContactLensPackPrice(Product $product, int $packQuantity): ?float
    {
        $config = $product->contact_lens_unit_config;
        if (!is_array($config) || empty($config['packs']) || !is_array($config['packs'])) {
            return null;
        }

        foreach ($config['packs'] as $pack) {
            if (!is_array($pack)) {
                continue;
            }
            if ((int) ($pack['quantity'] ?? 0) === $packQuantity) {
                if (isset($pack['price']) && $pack['price'] !== '' && is_numeric($pack['price'])) {
                    return (float) $pack['price'];
                }

                return (float) $product->price;
            }
        }

        return null;
    }
}

