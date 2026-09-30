<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\StoreOrder;
use App\Services\Marketplace\DeliveryVerificationService;
use App\Services\Marketplace\RefundService;
use App\Services\Notifications\MarketplaceNotificationService;
use Illuminate\Http\Request;

class AdminStoreOrderController extends Controller
{
    public function updateStatus(Request $r, int $id)
    {
        $data = $r->validate(['status' => 'required|in:processing,out_for_delivery,delivered,cancelled,refunded,disputed,resolve_dispute',
            'reason' => 'required|string|min:5|max:2000', 'delivery_code' => ['required_if:status,delivered', 'nullable', 'regex:/^\d{6}$/D']]);
        $so = StoreOrder::findOrFail($id);
        $result = match ($data['status']) {
            'cancelled', 'refunded' => app(RefundService::class)->cancel($so, $r->user(), $data['reason']),
            'disputed' => app(RefundService::class)->dispute($so, $r->user(), $data['reason']),
            'resolve_dispute' => app(RefundService::class)->resolve($so, $r->user(), $data['reason']),
            'delivered' => app(DeliveryVerificationService::class)->verify($so, $r->user(), $data['delivery_code']),
            default => app(DeliveryVerificationService::class)->advance($so, $r->user(), $data['status']),
        };

        $result->loadMissing(['order.user', 'store.user']);
        $labels = [
            'processing' => ['Ordine in preparazione', "L'ordine {$result->order?->order_no} è ora in preparazione."],
            'out_for_delivery' => ['Ordine spedito', "L'ordine {$result->order?->order_no} è in consegna."],
            'delivered' => ['Ordine consegnato', "L'ordine {$result->order?->order_no} è stato consegnato e confermato."],
            'cancelled' => ['Ordine annullato', "L'ordine {$result->order?->order_no} è stato annullato."],
            'refunded' => ['Ordine rimborsato', "L'ordine {$result->order?->order_no} è stato rimborsato."],
            'disputed' => ['Contestazione aperta', "È stata aperta una contestazione per l'ordine {$result->order?->order_no}."],
            'resolve_dispute' => ['Contestazione risolta', "La contestazione per l'ordine {$result->order?->order_no} è stata risolta."],
        ];
        [$title, $message] = $labels[$data['status']];
        app(MarketplaceNotificationService::class)->send($result->order?->user, 'order.'.$data['status'], $title, $message,
            "/store-orders/{$result->id}", ['order_id' => $result->order_id, 'store_order_id' => $result->id, 'reason' => $data['reason']]);
        if (in_array($data['status'], ['cancelled', 'refunded', 'disputed', 'resolve_dispute'], true)) {
            app(MarketplaceNotificationService::class)->send($result->store?->user, 'order.'.$data['status'], $title, $message,
                "/orders/{$result->id}", ['order_id' => $result->order_id, 'store_order_id' => $result->id, 'reason' => $data['reason']]);
        }

        return R::success($result->fresh(['items', 'escrow', 'payment.transaction', 'payment.refundTransaction']));
    }
}
