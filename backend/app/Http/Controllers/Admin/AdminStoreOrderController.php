<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\StoreOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStoreOrderController extends Controller
{
    /**
     * Override fulfillment status for a store shipment (admin support / disputes).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,accepted,rejected,paid,processing,out_for_delivery,delivered,cancelled',
        ]);

        $storeOrder = StoreOrder::with(['order', 'store'])->findOrFail($id);
        $storeOrder->update(['status' => $request->status]);

        return ResponseHelper::success($storeOrder->fresh(['order', 'store', 'items']), 'Store order status updated');
    }
}
