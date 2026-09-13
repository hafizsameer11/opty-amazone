<?php

namespace App\Observers;

use App\Models\StoreOrder;

class BannerOrderObserver
{
    public function updated(StoreOrder $order): void
    {
        if ($order->wasChanged('status')) { app(\App\Services\Campaigns\BannerDeliveryService::class)->convert($order); }
    }
}
