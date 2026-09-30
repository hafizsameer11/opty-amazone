<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\StoreOrder;
use App\Services\Coupon\CouponValidationException;
use App\Services\Email\MarketplaceEmailService;
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
        try {
            $so = app(PaymentService::class)->pay($this->shipments()->findOrFail($id), $r->user(), $data);
        } catch (CouponValidationException $exception) {
            return R::error($exception->getMessage(), ['reason' => $exception->reason], 422);
        }
        $notifications = app(MarketplaceNotificationService::class);
        $notifications->send($r->user(), 'order.payment_completed', 'Pagamento completato',
            "Il pagamento per l'ordine {$so->order?->order_no} è stato completato con successo.", "/store-orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id, 'amount' => (float) $so->total]);
        $notifications->send($so->store?->user, 'order.payment_received', "L'acquirente ha completato il pagamento",
            "Il pagamento per l'ordine {$so->order?->order_no} è stato completato.", "/orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id, 'amount' => (float) $so->total]);
        $notifications->send($r->user(), 'order.delivery_code_available', 'Codice di consegna disponibile',
            'Il tuo codice di conferma della consegna è disponibile nei dettagli dell\'ordine.', "/store-orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id]);
        app(MarketplaceEmailService::class)->paymentReceiptBuyer($so);
        app(MarketplaceEmailService::class)->paymentReceivedSeller($so);

        return R::success(['store_order' => app(OrderView::class)->buyerShipment($so), 'escrow' => $so->escrow], 'Payment confirmed; funds held in escrow.');
    }

    public function cancelStoreOrder(Request $r, $id)
    {
        $so = app(RefundService::class)->cancel($this->shipments()->findOrFail($id), $r->user(), 'Buyer cancellation');
        app(MarketplaceNotificationService::class)->send($so->store?->user, 'order.refunded', 'Ordine rimborsato',
            "L'ordine {$so->order?->order_no} è stato annullato e rimborsato.", "/orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id]);
        return R::success($so);
    }

    public function dispute(Request $r, $id)
    {
        $data = $r->validate(['reason' => 'required|string|min:5|max:2000']);

        $so = app(RefundService::class)->dispute($this->shipments()->findOrFail($id), $r->user(), $data['reason']);
        app(MarketplaceNotificationService::class)->send($so->store?->user, 'order.disputed', 'Contestazione aperta',
            "È stata aperta una contestazione per l'ordine {$so->order?->order_no}.", "/orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id, 'reason' => $data['reason']]);
        return R::success($so);
    }

    public function deliveryCode(Request $r, $id)
    {
        $so = app(DeliveryVerificationService::class)->reissue($this->shipments()->findOrFail($id), $r->user());
        $notifications = app(MarketplaceNotificationService::class);
        $notifications->send($r->user(), 'order.delivery_code_available', 'Nuovo codice di consegna disponibile',
            'Un nuovo codice di conferma della consegna è disponibile nei dettagli dell\'ordine.', "/store-orders/{$so->id}",
            ['order_id' => $so->order_id, 'store_order_id' => $so->id]);
        $notifications->send($so->store?->user, 'order.delivery_code_reissued', 'Codice di consegna riemesso',
            "L'acquirente ha richiesto un nuovo codice di consegna per l'ordine {$so->order?->order_no}.", "/orders/{$so->id}",
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
