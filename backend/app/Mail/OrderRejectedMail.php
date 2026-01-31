<?php

namespace App\Mail;

use App\Models\StoreOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StoreOrder $storeOrder) {}

    public function build()
    {
        return $this->subject("Order Rejected - {$this->storeOrder->order->order_no}")
            ->view('emails.order-rejected')
            ->with(['storeOrder' => $this->storeOrder]);
    }
}

