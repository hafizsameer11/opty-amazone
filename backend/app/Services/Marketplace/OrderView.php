<?php

namespace App\Services\Marketplace;

use App\Models\Order;
use App\Models\StoreOrder;

class OrderView
{
    public function buyerShipment(StoreOrder $so): array
    {
        return $so->toArray() + ['delivery_code' => app(DeliveryVerificationService::class)->buyerCode($so)];
    }

    public function buyerOrder(Order $order): array
    {
        $data = $order->toArray();
        $data['store_orders'] = $order->storeOrders->map(fn ($so) => $this->buyerShipment($so))->all();

        return $data;
    }
}
