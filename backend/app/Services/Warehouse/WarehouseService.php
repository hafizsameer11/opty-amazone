<?php

namespace App\Services\Warehouse;

use App\Models\{User, WarehouseCart, WarehouseCartItem, WarehouseOrder, WarehouseOrderItem, WarehouseProduct};
use App\Services\Marketplace\{Money, SellerWalletService};
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Standalone Admin-to-Seller warehouse purchasing domain.  It never reads or
 * writes marketplace carts, StoreOrders, buyer wallets, or delivery codes.
 */
class WarehouseService
{
    public function cart(User $seller): WarehouseCart
    {
        return WarehouseCart::firstOrCreate(['seller_id' => $seller->id]);
    }

    public function cartPayload(User $seller): array
    {
        $cart = $this->cart($seller)->load(['items.product.category']);
        return $this->quoteCart($cart);
    }

    public function addToCart(User $seller, int $productId, int $quantity): array
    {
        $product = WarehouseProduct::query()->where('is_active', true)->findOrFail($productId);
        if ($product->stock_quantity < $quantity) $this->stockError($product);
        $cart = $this->cart($seller);
        $item = WarehouseCartItem::firstOrNew(['warehouse_cart_id' => $cart->id, 'warehouse_product_id' => $product->id]);
        $next = (int) $item->quantity + $quantity;
        if ($next > $product->stock_quantity) $this->stockError($product);
        $item->quantity = $next;
        $item->save();
        return $this->cartPayload($seller);
    }

    public function updateCartItem(User $seller, int $itemId, int $quantity): array
    {
        $item = $this->cart($seller)->items()->with('product')->findOrFail($itemId);
        if (! $item->product || ! $item->product->is_active || $quantity > $item->product->stock_quantity) $this->stockError($item->product);
        $item->update(['quantity' => $quantity]);
        return $this->cartPayload($seller);
    }

    public function removeCartItem(User $seller, int $itemId): array
    {
        $this->cart($seller)->items()->whereKey($itemId)->delete();
        return $this->cartPayload($seller);
    }

    public function checkout(User $seller, string $idempotencyKey, ?array $shippingAddress = null): WarehouseOrder
    {
        return DB::transaction(function () use ($seller, $idempotencyKey, $shippingAddress) {
            if ($existing = WarehouseOrder::where('seller_id', $seller->id)->where('idempotency_key', $idempotencyKey)->first()) {
                return $existing->load(['items.product', 'store']);
            }

            $store = $seller->store;
            if (! $store) throw ValidationException::withMessages(['warehouse' => ['A verified seller store is required for warehouse purchases.']]);
            $cart = WarehouseCart::where('seller_id', $seller->id)->lockForUpdate()->first();
            if (! $cart || ! $cart->items()->exists()) throw ValidationException::withMessages(['cart' => ['Your warehouse cart is empty.']]);
            $items = $cart->items()->orderBy('warehouse_product_id')->get();
            $products = WarehouseProduct::with('category')->whereIn('id', $items->pluck('warehouse_product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $lines = [];
            $subtotal = $shipping = 0;

            foreach ($items as $cartItem) {
                $product = $products->get($cartItem->warehouse_product_id);
                if (! $product || ! $product->is_active || $cartItem->quantity > $product->stock_quantity) $this->stockError($product);
                $line = Money::cents($product->price) * (int) $cartItem->quantity;
                $subtotal += $line;
                // Shipping is an admin-owned product rate and is charged once
                // per distinct warehouse item line, never supplied by seller UI.
                $shipping += Money::cents($product->shipping_fee);
                $lines[] = compact('product', 'cartItem', 'line');
            }

            $total = $subtotal + $shipping;
            $walletService = app(SellerWalletService::class);
            $wallet = $walletService->locked($store->id);
            if (Money::cents($wallet->available_balance) < $total) {
                throw ValidationException::withMessages(['wallet' => ['Your Seller Wallet does not have enough available funds for this warehouse order.']]);
            }

            $order = WarehouseOrder::create([
                'order_number' => 'WH-'.now()->format('Ymd').'-'.Str::upper(Str::random(8)),
                'idempotency_key' => $idempotencyKey, 'seller_id' => $seller->id, 'store_id' => $store->id,
                'status' => 'pending', 'payment_status' => 'paid', 'subtotal' => Money::decimal($subtotal),
                'shipping_fee' => Money::decimal($shipping), 'total' => Money::decimal($total),
                'shipping_address' => $shippingAddress, 'paid_at' => now(),
            ]);

            foreach ($lines as ['product' => $product, 'cartItem' => $cartItem, 'line' => $line]) {
                WarehouseOrderItem::create([
                    'warehouse_order_id' => $order->id, 'warehouse_product_id' => $product->id,
                    'product_name' => $product->name, 'sku' => $product->sku, 'image_path' => $product->image_path,
                    'unit_price' => $product->price, 'quantity' => $cartItem->quantity, 'line_total' => Money::decimal($line),
                    'product_snapshot' => $this->productSnapshot($product),
                ]);
                $product->decrement('stock_quantity', (int) $cartItem->quantity);
            }

            $entry = $walletService->entry(
                $wallet, "warehouse:purchase:{$order->id}", 'warehouse_purchase', $total,
                ['available_balance' => -$total], null, null, null,
                "Warehouse order {$order->order_number}", ['warehouse_order_id' => $order->id]
            );
            $order->update(['seller_wallet_entry_id' => $entry->id]);
            $cart->items()->delete();

            return $order->load(['items.product', 'store']);
        }, 5);
    }

    public function updateOrder(WarehouseOrder $order, array $data): WarehouseOrder
    {
        return DB::transaction(function () use ($order, $data) {
            $locked = WarehouseOrder::lockForUpdate()->findOrFail($order->id);
            $next = $data['status'] ?? $locked->status;
            if ($locked->status === 'cancelled' && $next !== 'cancelled') {
                throw ValidationException::withMessages(['status' => ['A cancelled warehouse order cannot be reopened.']]);
            }
            if ($locked->status === 'delivered' && $next === 'cancelled') {
                throw ValidationException::withMessages(['status' => ['A delivered warehouse order cannot be cancelled.']]);
            }
            if ($next === 'cancelled' && $locked->status !== 'cancelled') {
                $wallet = app(SellerWalletService::class)->locked((int) $locked->store_id);
                $amount = Money::cents($locked->total);
                app(SellerWalletService::class)->entry(
                    $wallet, "warehouse:refund:{$locked->id}", 'warehouse_refund', $amount,
                    app(SellerWalletService::class)->creditAvailable($wallet, $amount), null, null, null,
                    "Refund for warehouse order {$locked->order_number}", ['warehouse_order_id' => $locked->id]
                );
                // Cancellation reverses the fulfilled inventory allocation as
                // well as the wallet payment. Lock products in a stable order
                // so concurrent checkout/cancellation flows cannot oversell.
                $items = $locked->items()->orderBy('warehouse_product_id')->get();
                $products = WarehouseProduct::withTrashed()
                    ->whereIn('id', $items->pluck('warehouse_product_id')->filter())
                    ->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                foreach ($items as $item) {
                    if ($product = $products->get($item->warehouse_product_id)) {
                        $product->increment('stock_quantity', (int) $item->quantity);
                    }
                }
                $data['payment_status'] = 'refunded';
                $data['cancelled_at'] = now();
            }
            if ($next === 'delivered' && ! $locked->delivered_at) $data['delivered_at'] = now();
            $locked->update(array_filter($data, fn ($value) => $value !== null));
            return $locked->fresh()->load(['items.product', 'seller', 'store', 'walletEntry']);
        }, 5);
    }

    private function quoteCart(WarehouseCart $cart): array
    {
        $items = $cart->items->filter(fn (WarehouseCartItem $item) => $item->product)->values();
        $subtotal = $items->sum(fn (WarehouseCartItem $item) => Money::cents($item->product->price) * (int) $item->quantity);
        $shipping = $items->sum(fn (WarehouseCartItem $item) => Money::cents($item->product->shipping_fee));
        return ['cart' => $cart, 'items' => $items, 'subtotal' => Money::decimal($subtotal), 'shipping_fee' => Money::decimal($shipping), 'total' => Money::decimal($subtotal + $shipping), 'currency' => 'EUR'];
    }

    private function stockError(?WarehouseProduct $product): never
    {
        $name = $product?->name ?? 'This warehouse product';
        throw ValidationException::withMessages(['quantity' => ["{$name} no longer has the requested stock available."]]);
    }

    private function productSnapshot(WarehouseProduct $product): array
    {
        return ['category' => $product->category?->only(['id', 'name', 'type']), 'color' => $product->color,
            'temple_size' => $product->temple_size, 'lens_size' => $product->lens_size, 'bridge_size' => $product->bridge_size,
            'details' => $product->details];
    }
}
