<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\StoreOrder;
use App\Services\Marketplace\DeliveryVerificationService;
use App\Services\Marketplace\RefundService;
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

        return R::success($result->fresh(['items', 'escrow', 'payment.transaction', 'payment.refundTransaction']));
    }
}
