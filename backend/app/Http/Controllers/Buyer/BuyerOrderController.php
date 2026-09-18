<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\StoreOrder;
use App\Services\Marketplace\DeliveryVerificationService;
use App\Services\Marketplace\OrderView;
use App\Services\Marketplace\PaymentService;
use App\Services\Marketplace\RefundService;
use App\Services\Notifications\MarketplaceNotificationService;
use Illuminate\Http\Request;

class BuyerOrderController extends Controller
{
    private function orders()
    {
        return Order::where('user_id', auth()->id())->with(['storeOrders.store', 'storeOrders.items', 'storeOrders.escrow', 'storeOrders.payment']);
    }

    private function shipments()
    {
        return StoreOrder::whereHas('order', fn ($q) => $q->where('user_id', auth()->id()))->with(['store', 'items', 'escrow', 'order', 'payment']);
    }

    public function index(Request $r)
    {
        return R::success($this->orders()->latest()->paginate(min(100, max(1, $r->integer('per_page', 15)))));
    }

    public function show($id)
    {
        return R::success(app(OrderView::class)->buyerOrder($this->orders()->findOrFail($id)));
    }

    public function storeOrders(Request $r)
    {
        return R::success($this->shipments()->latest()->paginate(min(100, max(1, $r->integer('per_page', 15)))));
    }

    public function showStoreOrder($id)
    {
        return R::success(app(OrderView::class)->buyerShipment($this->shipments()->findOrFail($id)));
    }

    public function payStoreOrder(Request $r, $id)
    {
        $data = $r->validate(['payment_method' => 'required|in:wallet,card', 'expected_total' => 'required|numeric|min:0', 'idempotency_key' => 'required|string|max:100']);
        $so = app(PaymentService::class)->pay($this->shipments()->findOrFail($id), $r->user(), $data);
        $notifications = app(MarketplaceNotificationService::class);
        $notifications->send($r->user(), 'order.payment_completed', 'Payment completed',
            "Payment for order {$so->order?->order_no} was completed successfully.", "/store-orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id, 'amount' => (float) $so->total]);
        $notifications->send($so->store?->user, 'order.payment_received', 'Buyer completed payment',
            "Payment was completed for order {$so->order?->order_no}.", "/orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id, 'amount' => (float) $so->total]);
        $notifications->send($r->user(), 'order.delivery_code_available', 'Delivery code available',
            'Your delivery verification code is available in the order details.', "/store-orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id]);

        return R::success(['store_order' => app(OrderView::class)->buyerShipment($so), 'escrow' => $so->escrow], 'Payment confirmed; funds held in escrow.');
    }

    public function cancelStoreOrder(Request $r, $id)
    {
        $so = app(RefundService::class)->cancel($this->shipments()->findOrFail($id), $r->user(), 'Buyer cancellation');
        app(MarketplaceNotificationService::class)->send($so->store?->user, 'order.refunded', 'Order refunded',
            "Order {$so->order?->order_no} was cancelled and refunded.", "/orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id]);
        return R::success($so);
    }

    public function dispute(Request $r, $id)
    {
        $data = $r->validate(['reason' => 'required|string|min:5|max:2000']);

        $so = app(RefundService::class)->dispute($this->shipments()->findOrFail($id), $r->user(), $data['reason']);
        app(MarketplaceNotificationService::class)->send($so->store?->user, 'order.disputed', 'Order dispute opened',
            "A dispute was opened for order {$so->order?->order_no}.", "/orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id, 'reason' => $data['reason']]);
        return R::success($so);
    }

    public function deliveryCode(Request $r, $id)
    {
        $so = app(DeliveryVerificationService::class)->reissue($this->shipments()->findOrFail($id), $r->user());
        $notifications = app(MarketplaceNotificationService::class);
        $notifications->send($r->user(), 'order.delivery_code_available', 'New delivery code available',
            'A new delivery verification code is available in the order details.', "/store-orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id]);
        $notifications->send($so->store?->user, 'order.delivery_code_reissued', 'Delivery code reissued',
            "The buyer requested a new delivery code for order {$so->order?->order_no}.", "/orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id]);
        return R::success(app(OrderView::class)->buyerShipment($so));
    }

    public function paymentInfo($id)
    {
        $order = $this->orders()->findOrFail($id);
        $unpaid = $order->storeOrders->where('status', 'awaiting_payment')->values();

        return R::success(['order' => app(OrderView::class)->buyerOrder($order), 'unpaid_store_orders' => $unpaid,
            'total_due' => $unpaid->sum('total'), 'card_available' => false]);
    }
}
