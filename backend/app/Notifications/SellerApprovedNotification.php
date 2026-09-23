<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SellerApprovedNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'event' => 'seller_approved',
            'title' => 'Your seller account is approved',
            'message' => 'Your seller account has been approved. Complete your Store Profile to start selling.',
            'url' => '/dashboard?setup=1',
            'context' => ['store_id' => $notifiable->store?->id],
        ];
    }

}
