<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Services\Campaigns\DiscountPricingService;
use App\Services\Coupon\CouponService;
use App\Services\Coupon\CouponValidationException;
use App\Services\Email\MarketplaceEmailService;
use App\Services\Notifications\MarketplaceNotificationService;
use App\Services\Order\OrderService;
use Illuminate\Http\Request;

class BuyerCheckoutController extends Controller
{
    public function __construct(
        private OrderService $orderService,
        private CouponService $couponService,
        private DiscountPricingService $pricing,
        private MarketplaceEmailService $emails,
    ) {}

    /** Official checkout preview; every amount comes from the current server cart. */
    public function preview(Request $request)
    {
        $request->validate([
            'coupon_code' => ['nullable', 'string', 'max:50'],
            'coupon_codes' => ['nullable', 'array'],
            'coupon_codes.*' => ['nullable', 'string', 'max:50'],
        ]);
        $cart = Cart::where('user_id', $request->user()->id)->first();
        if (! $cart) return ResponseHelper::error('Cart is empty.', null, 422);

        $codes = (array) $request->input('coupon_codes', []);
        if ($request->filled('coupon_code')) $codes['_single'] = $request->coupon_code;

        try {
            $this->pricing->repriceCart($cart);
            $quote = $this->couponService->quoteCart($cart, $request->user(), $codes);
            $stores = collect($quote['stores'])->map(function (array $store) {
                unset($store['_quote']);
                return $store + ['items_count' => 0, 'shipping_fee' => '0.00', 'total' => $store['final_before_shipping']];
            })->values()->all();
            return ResponseHelper::success([
                'breakdown' => $stores, 'stores' => $stores,
                'original_subtotal' => $quote['original_subtotal'],
                'automatic_campaign_discount' => $quote['automatic_campaign_discount'],
                'coupon_discount' => $quote['coupon_discount'],
                'shipping_discount' => $quote['shipping_discount'],
                'points_discount' => '0.00', 'items_total' => $quote['final_before_shipping'],
                'shipping_total' => '0.00', 'grand_total' => $quote['final_before_shipping'],
            ], 'Checkout preview calculated successfully.');
        } catch (CouponValidationException $exception) {
            return ResponseHelper::error($exception->getMessage(), ['reason' => $exception->reason], 422);
        }
    }

    public function place(Request $request)
    {
        $request->validate([
            'delivery_address_id' => ['required', \Illuminate\Validation\Rule::exists('user_addresses', 'id')->where('user_id', $request->user()->id)->whereNull('deleted_at')],
            'payment_method' => 'nullable|in:card,wallet',
            'coupon_code' => 'nullable|string|max:50', 'coupon_codes' => 'nullable|array',
            'coupon_codes.*' => 'nullable|string|max:50', 'points_to_redeem' => 'nullable|numeric|min:0',
            'idempotency_key' => 'nullable|string|max:120',
        ]);
        $user = $request->user();
        try {
            $result = $this->orderService->placeOrder(
                $user, $request->delivery_address_id, $request->payment_method, $request->coupon_code,
                $request->points_to_redeem ? (float) $request->points_to_redeem : null,
                (array) $request->input('coupon_codes', []), $request->input('idempotency_key')
            );
            $notifications = app(MarketplaceNotificationService::class);
            $order = $result['order'];
            $notifications->send($user, 'order.placed', 'Order placed successfully', "Your order {$order->order_no} has been placed successfully.", "/orders/{$order->id}", ['order_id' => $order->id, 'order_no' => $order->order_no]);
            foreach ($result['store_orders'] as $storeOrder) {
                $notifications->send($storeOrder->store?->user, 'order.received', 'New order received', "A new order {$order->order_no} is waiting for your review.", "/orders/{$storeOrder->id}", ['order_id' => $order->id, 'store_order_id' => $storeOrder->id, 'order_no' => $order->order_no]);
            }
            $this->emails->orderPlacedBuyer($order);
            foreach ($result['store_orders'] as $storeOrder) $this->emails->orderPlacedSeller($storeOrder);

            return ResponseHelper::success(['order' => $result['order'], 'store_orders' => $result['store_orders']], 'Order placed successfully');
        } catch (CouponValidationException $exception) {
            return ResponseHelper::error($exception->getMessage(), ['reason' => $exception->reason], 422);
        } catch (\Exception $exception) {
            return ResponseHelper::error($exception->getMessage());
        }
    }
}
