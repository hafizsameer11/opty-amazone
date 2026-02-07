<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Services\Order\OrderService;
use App\Mail\OrderPlacedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class BuyerCheckoutController extends Controller
{
    protected $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Preview checkout (calculate totals).
     */
    public function preview(Request $request)
    {
        $user = Auth::user();
        $cart = \App\Models\Cart::where('user_id', $user->id)->with('items.product', 'items.store')->first();

        if (!$cart || $cart->items()->count() === 0) {
            return ResponseHelper::error('Cart is empty');
        }

        // Group items by store
        $itemsByStore = $cart->items()->get()->groupBy('store_id');
        $breakdown = [];

        foreach ($itemsByStore as $storeId => $items) {
            $store = $items->first()->store;
            $subtotal = $items->sum(function ($item) {
                return $item->price * $item->quantity;
            });

            // Calculate shipping (placeholder - should use delivery pricing rules)
            $shippingFee = 0; // Will be set by seller on accept

            $breakdown[] = [
                'store_id' => $storeId,
                'store_name' => $store->name,
                'items_count' => $items->count(),
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'total' => $subtotal + $shippingFee,
            ];
        }

        $grandTotal = collect($breakdown)->sum('total');

        return ResponseHelper::success([
            'breakdown' => $breakdown,
            'items_total' => collect($breakdown)->sum('subtotal'),
            'shipping_total' => collect($breakdown)->sum('shipping_fee'),
            'grand_total' => $grandTotal,
        ], 'Checkout preview');
    }

    /**
     * Place order.
     */
    public function place(Request $request)
    {
        $request->validate([
            'delivery_address_id' => 'required|exists:user_addresses,id',
            'payment_method' => 'nullable|in:card,wallet',
            'coupon_code' => 'nullable|string',
            'points_to_redeem' => 'nullable|numeric|min:0',
        ]);

        $user = Auth::user();

        try {
            $result = $this->orderService->placeOrder(
                $user,
                $request->delivery_address_id,
                $request->payment_method,
                $request->coupon_code,
                $request->points_to_redeem ? (float) $request->points_to_redeem : null
            );

            // Send email notifications
            Mail::to($user->email)->send(new OrderPlacedMail($result['order']));
            foreach ($result['store_orders'] as $storeOrder) {
                Mail::to($storeOrder->store->user->email)->send(new OrderPlacedMail($result['order'], $storeOrder));
            }

            return ResponseHelper::success([
                'order' => $result['order'],
                'store_orders' => $result['store_orders'],
            ], 'Order placed successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }
}

