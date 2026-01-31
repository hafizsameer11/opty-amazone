<?php

namespace App\Mail;

use App\Models\StoreOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderOutForDeliveryMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StoreOrder $storeOrder) {}

    public function build()
    {
        return $this->subject("Order Shipped - {$this->storeOrder->order->order_no}")
            ->view('emails.order-out-for-delivery')
            ->with(['storeOrder' => $this->storeOrder]);
    }
}

