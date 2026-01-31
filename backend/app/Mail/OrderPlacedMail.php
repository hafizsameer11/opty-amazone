<?php

namespace App\Mail;

use App\Models\Order;
use App\Models\StoreOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderPlacedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Order $order,
        public ?StoreOrder $storeOrder = null
    ) {}

    public function build()
    {
        $subject = $this->storeOrder 
            ? "New Order Received - {$this->storeOrder->order->order_no}"
            : "Order Placed - {$this->order->order_no}";

        return $this->subject($subject)
            ->view('emails.order-placed')
            ->with([
                'order' => $this->order,
                'storeOrder' => $this->storeOrder,
            ]);
    }
}

