<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\StoreReinstatementRequest;
use App\Services\Store\StoreModerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerStoreReinstatementController extends Controller
{
    public function __construct(private StoreModerationService $moderation) {}

    public function index(Request $request): JsonResponse
    {
        $items = StoreReinstatementRequest::where('seller_id', $request->user()->id)
            ->with('store:id,name,status,is_active')
            ->latest()->get()
            ->map(fn (StoreReinstatementRequest $item) => $this->serialize($item));

        return ResponseHelper::success(['requests' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:10', 'max:5000']]);
        $item = $this->moderation->requestReinstatement($request->user(), $data['reason']);

        return ResponseHelper::success(['request' => $this->serialize($item)], 'Reinstatement request submitted', 201);
    }

    private function serialize(StoreReinstatementRequest $item): array
    {
        return [
            'id' => $item->id,
            'store_id' => $item->store_id,
            'reason' => $item->reason,
            'status' => $item->status,
            'admin_notes' => $item->admin_notes,
            'reviewed_at' => $item->reviewed_at?->toIso8601String(),
            'created_at' => $item->created_at?->toIso8601String(),
            'store' => $item->store ? [
                'id' => $item->store->id,
                'name' => $item->store->name,
                'status' => $item->store->status,
                'is_active' => (bool) $item->store->is_active,
            ] : null,
        ];
    }
}
