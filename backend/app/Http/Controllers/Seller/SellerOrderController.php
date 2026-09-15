<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\StoreOrder;
use App\Services\Marketplace\DeliveryVerificationService;
use App\Services\Marketplace\OrderTotalsService;
use App\Services\Marketplace\RefundService;
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
        app(OrderTotalsService::class)->quote($this->orders()->findOrFail($id), $r->user(), $data);

        return $this->show($id);
    }

    public function reject(Request $r, $id)
    {
        $data = $r->validate(['reason' => 'required|string|max:2000']);
        app(RefundService::class)->cancel($this->orders()->findOrFail($id), $r->user(), $data['reason']);

        return $this->show($id);
    }

    public function processing(Request $r, $id)
    {
        app(DeliveryVerificationService::class)->advance($this->orders()->findOrFail($id), $r->user(), 'processing');

        return $this->show($id);
    }

    public function outForDelivery(Request $r, $id)
    {
        app(DeliveryVerificationService::class)->advance($this->orders()->findOrFail($id), $r->user(), 'out_for_delivery');

        return $this->show($id);
    }

    public function delivered(Request $r, $id)
    {
        $data = $r->validate(['delivery_code' => ['required', 'regex:/^\d{6}$/D']]);
        app(DeliveryVerificationService::class)->verify($this->orders()->findOrFail($id), $r->user(), $data['delivery_code']);

        return $this->show($id);
    }
}
