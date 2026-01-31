<?php

namespace App\Mail;

use App\Models\StoreOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderPaidMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public StoreOrder $storeOrder) {}

    public function build()
    {
        return $this->subject("Payment Received - Order #{$this->storeOrder->id}")
            ->view('emails.order-paid')
            ->with(['storeOrder' => $this->storeOrder]);
    }
}

