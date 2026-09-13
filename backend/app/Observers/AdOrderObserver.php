<?php

namespace App\Observers;

use App\Jobs\AttributeAdPurchase;
use App\Models\StoreOrder;

class AdOrderObserver
{
    public function updated(StoreOrder $order): void
    {
        if ($order->paid_at && $order->wasChanged(['status', 'paid_at'])) {
            AttributeAdPurchase::dispatch($order->id);
        }
    }
}
