<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Models\Order;
use App\Models\StoreOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only order view for the CRM.
 *
 * An `Order` is a buyer basket that fans out into one `StoreOrder` per seller,
 * so this controller returns the basket alongside its per-seller split. The
 * CRM must read per-seller revenue from `store_orders.total`, never from
 * `orders.grand_total`.
 *
 * Delivery codes, delivery-code hashes, quote fingerprints and wallet
 * references are deliberately never serialised here.
 */
class CrmOrdersController extends CrmController
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:120',
            'payment_status' => 'nullable|string|max:40',
            'payment_method' => 'nullable|string|max:40',
            'store_id' => 'nullable|integer',
        ]);

        $window = $this->validateWindow($request);
        $paging = $this->validatePagination($request);

        $query = Order::query()
            ->with('user:id,name,email')
            ->withCount('storeOrders')
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('order_no', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($u) => $u
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->when($filters['payment_status'] ?? null, fn ($q, $status) => $q->where('payment_status', $status))
            ->when($filters['payment_method'] ?? null, fn ($q, $method) => $q->where('payment_method', $method))
            ->when($filters['store_id'] ?? null, fn ($q, $id) => $q->whereHas(
                'storeOrders',
                fn ($so) => $so->where('store_id', $id)
            ));

        $this->applyWindow($query, $window['from'], $window['to']);

        $paginator = $query->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (Order $order) => $this->row($order))->values();

        return $this->paginated(
            $paginator->setCollection($rows),
            ['summary' => $this->summary()],
            [
                'payment_statuses' => ['pending', 'paid', 'failed', 'refunded', 'cancelled', 'legacy_review'],
                'payment_methods' => ['card', 'wallet', 'cash_on_delivery'],
            ]
        );
    }

    public function show(Request $request, int $order): JsonResponse
    {
        $model = Order::with([
            'user:id,name,email,phone',
            'storeOrders.store:id,name',
            'storeOrders.items',
            'storeOrders.escrow',
        ])->find($order);

        if (! $model) {
            return ResponseHelper::notFound('Order not found.');
        }

        return ResponseHelper::success([
            'order' => $this->row($model, true),
            'store_orders' => $model->storeOrders->map(fn (StoreOrder $storeOrder) => [
                'id' => (int) $storeOrder->id,
                'store' => $storeOrder->store ? [
                    'id' => (int) $storeOrder->store->id,
                    'name' => (string) $storeOrder->store->name,
                ] : null,
                'status' => (string) $storeOrder->status,
                'payment_status' => (string) $storeOrder->payment_status,
                'subtotal' => round((float) $storeOrder->subtotal, 2),
                'delivery_fee' => round((float) $storeOrder->delivery_fee, 2),
                'discount_total' => round((float) $storeOrder->discount_total, 2),
                'total' => round((float) $storeOrder->total, 2),
                'currency' => 'EUR',
                'delivery_method' => $storeOrder->delivery_method,
                'estimated_delivery_date' => $storeOrder->estimated_delivery_date?->toDateString(),
                'delivered_at' => $storeOrder->delivered_at?->toISOString(),
                'rejection_reason' => $storeOrder->rejection_reason,
                'escrow' => $storeOrder->escrow ? [
                    'amount' => round((float) $storeOrder->escrow->amount, 2),
                    'status' => (string) $storeOrder->escrow->status,
                ] : null,
                'items' => $storeOrder->items->map(fn ($item) => [
                    'product_id' => $item->product_id ? (int) $item->product_id : null,
                    'product_name' => (string) $item->product_name,
                    'product_sku' => (string) $item->product_sku,
                    'quantity' => (int) $item->quantity,
                    'price' => round((float) $item->price, 2),
                    'line_total' => round((float) $item->line_total, 2),
                    'lens_configuration' => $item->lens_configuration,
                    'product_variant' => $item->product_variant,
                ])->values(),
            ])->values(),
        ]);
    }

    /** @return array<string, mixed> */
    private function row(Order $order, bool $detailed = false): array
    {
        $row = [
            'id' => (int) $order->id,
            'order_no' => (string) $order->order_no,
            'customer' => $order->user ? [
                'id' => (int) $order->user->id,
                'name' => (string) $order->user->name,
                'email' => (string) $order->user->email,
            ] : null,
            'payment_method' => (string) $order->payment_method,
            'payment_status' => (string) $order->payment_status,
            'items_total' => round((float) $order->items_total, 2),
            'shipping_total' => round((float) $order->shipping_total, 2),
            'platform_fee' => round((float) $order->platform_fee, 2),
            'discount_total' => round((float) $order->discount_total, 2),
            'grand_total' => round((float) $order->grand_total, 2),
            'currency' => 'EUR',
            'sellers_count' => (int) $order->storeOrders_count,
            'created_at' => $order->created_at?->toISOString(),
        ];

        if (! $detailed) {
            return $row;
        }

        $address = $order->delivery_address_snapshot;

        return array_merge($row, [
            'phone' => $order->user?->phone,
            'delivery_address' => is_array($address) ? [
                'full_name' => $address['full_name'] ?? null,
                'city' => $address['city'] ?? null,
                'state' => $address['state'] ?? null,
                'country' => $address['country'] ?? null,
                'postal_code' => $address['postal_code'] ?? null,
            ] : null,
        ]);
    }

    /** @return array<string, int|float> */
    private function summary(): array
    {
        $paid = Order::where('payment_status', 'paid');

        return [
            'total_orders' => (int) Order::count(),
            'paid' => (int) (clone $paid)->count(),
            'pending' => (int) Order::where('payment_status', 'pending')->count(),
            'refunded' => (int) Order::where('payment_status', 'refunded')->count(),
            'cancelled' => (int) Order::where('payment_status', 'cancelled')->count(),
            'gross_value' => round((float) Order::sum('grand_total'), 2),
            'paid_value' => round((float) (clone $paid)->sum('grand_total'), 2),
            'average_order_value' => (clone $paid)->count() > 0
                ? round((float) (clone $paid)->sum('grand_total') / (clone $paid)->count(), 2)
                : 0.0,
        ];
    }
}
