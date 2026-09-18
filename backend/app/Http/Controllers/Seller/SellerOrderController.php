<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\StoreOrder;
use App\Services\Marketplace\DeliveryVerificationService;
use App\Services\Marketplace\OrderTotalsService;
use App\Services\Marketplace\RefundService;
use App\Services\Notifications\MarketplaceNotificationService;
use App\Notifications\MarketplaceNotification;
use Illuminate\Http\Request;

class SellerOrderController extends Controller
{
    private function orders()
    {
        abort_unless(auth()->user()->store, 404, 'Store not found.');

        return StoreOrder::where('store_id', auth()->user()->store->id)
            ->with(['order:id,user_id,order_no', 'order.user:id,name,email,phone', 'items', 'escrow', 'payment']);
    }

    public function index(Request $r)
    {
        return R::success($this->orders()->when($r->filled('status'), fn ($q) => $q->where('status', $r->status))->latest()->paginate(min(100, max(1, $r->integer('per_page', 15)))));
    }

    public function show($id)
    {
        return R::success($this->orders()->findOrFail($id));
    }

    public function pending(Request $r)
    {
        $r->merge(['status' => 'pending']);

        return $this->index($r);
    }

    public function accept(Request $r, $id)
    {
        $data = $r->validate(['delivery_fee' => 'required|numeric|min:0|max:100000', 'delivery_method' => 'required|string|max:255',
            'estimated_delivery_date' => 'required|date_format:Y-m-d|after_or_equal:today', 'delivery_notes' => 'present|nullable|string|max:2000',
            'idempotency_key' => 'required|string|max:100']);
        $storeOrder = app(OrderTotalsService::class)->quote($this->orders()->findOrFail($id), $r->user(), $data);
        app(MarketplaceNotificationService::class)->send(
            $storeOrder->order?->user,
            'order.accepted',
            'Seller accepted your order',
            "The seller accepted order {$storeOrder->order?->order_no} and added a delivery fee. Review the total and complete payment.",
            "/store-orders/{$storeOrder->id}",
            ['order_id' => $storeOrder->order_id, 'store_order_id' => $storeOrder->id, 'delivery_fee' => (float) $storeOrder->delivery_fee]
        );

        return $this->show($id);
    }

    public function reject(Request $r, $id)
    {
        $data = $r->validate(['reason' => 'required|string|max:2000']);
        $storeOrder = app(RefundService::class)->cancel($this->orders()->findOrFail($id), $r->user(), $data['reason']);
        app(MarketplaceNotificationService::class)->send(
            $storeOrder->order?->user,
            'order.rejected',
            'Order rejected',
            "The seller rejected order {$storeOrder->order?->order_no}.",
            "/store-orders/{$storeOrder->id}",
            ['order_id' => $storeOrder->order_id, 'store_order_id' => $storeOrder->id, 'reason' => $data['reason']]
        );

        return $this->show($id);
    }

    public function processing(Request $r, $id)
    {
        $storeOrder = app(DeliveryVerificationService::class)->advance($this->orders()->findOrFail($id), $r->user(), 'processing');
        app(MarketplaceNotificationService::class)->send($storeOrder->order?->user, 'order.processing', 'Order processing',
            "Your order {$storeOrder->order?->order_no} is now being processed.", "/store-orders/{$storeOrder->id}",
            ['order_id' => $storeOrder->order_id, 'store_order_id' => $storeOrder->id]);

        return $this->show($id);
    }

    public function outForDelivery(Request $r, $id)
    {
        $storeOrder = app(DeliveryVerificationService::class)->advance($this->orders()->findOrFail($id), $r->user(), 'out_for_delivery');
        app(MarketplaceNotificationService::class)->send($storeOrder->order?->user, 'order.shipped', 'Order shipped',
            "Your order {$storeOrder->order?->order_no} is out for delivery.", "/store-orders/{$storeOrder->id}",
            ['order_id' => $storeOrder->order_id, 'store_order_id' => $storeOrder->id]);

        return $this->show($id);
    }

    /**
     * Tell the buyer that the seller has started the delivery confirmation
     * flow and needs the buyer's delivery code.
     */
    public function requestDeliveryCode(Request $r, $id)
    {
        $storeOrder = $this->orders()->findOrFail($id);
        abort_unless($storeOrder->status === 'out_for_delivery', 422, 'The delivery code can only be requested for an out-for-delivery order.');

        $buyer = $storeOrder->order?->user;
        if ($buyer) {
            $alreadyUnread = $buyer->unreadNotifications()
                ->where('type', MarketplaceNotification::class)
                ->get()
                ->contains(function ($notification) use ($storeOrder) {
                    $data = is_array($notification->data) ? $notification->data : [];

                    return ($data['event'] ?? null) === 'order.delivery_code_requested'
                        && (int) ($data['context']['store_order_id'] ?? 0) === (int) $storeOrder->id;
                });

            if (! $alreadyUnread) {
                app(MarketplaceNotificationService::class)->send(
                    $buyer,
                    'order.delivery_code_requested',
                    'Delivery confirmation code requested',
                    "The seller is requesting your delivery confirmation code for order {$storeOrder->order?->order_no}. Please share your delivery code with the seller to confirm delivery.",
                    "/stores/{$storeOrder->store_id}?chat=1&delivery_order_id={$storeOrder->id}",
                    [
                        'order_id' => $storeOrder->order_id,
                        'store_order_id' => $storeOrder->id,
                        'buyer_id' => $buyer->id,
                        'seller_id' => $r->user()->id,
                        'store_id' => $storeOrder->store_id,
                    ]
                );
            }
        }

        return $this->show($id);
    }

    public function delivered(Request $r, $id)
    {
        $data = $r->validate(['delivery_code' => ['required', 'regex:/^\d{6}$/D']]);
        $storeOrder = app(DeliveryVerificationService::class)->verify($this->orders()->findOrFail($id), $r->user(), $data['delivery_code']);
        app(MarketplaceNotificationService::class)->send($storeOrder->order?->user, 'order.delivered', 'Order delivered',
            "Order {$storeOrder->order?->order_no} has been delivered and confirmed.", "/store-orders/{$storeOrder->id}",
            ['order_id' => $storeOrder->order_id, 'store_order_id' => $storeOrder->id]);

        return $this->show($id);
    }
}
