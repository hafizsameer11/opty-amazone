<?php

namespace App\Mail;

use App\Models\StoreOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderAcceptedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StoreOrder $storeOrder) {}

    public function build()
    {
        return $this->subject("Order Accepted - {$this->storeOrder->order->order_no}")
            ->view('emails.order-accepted')
            ->with(['storeOrder' => $this->storeOrder]);
    }
}

