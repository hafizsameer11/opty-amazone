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
            'title' => 'Il tuo account venditore è stato approvato',
            'message' => 'Il tuo account venditore è stato approvato. Completa il profilo del tuo negozio per iniziare a vendere.',
            'url' => '/dashboard?setup=1',
            'context' => ['store_id' => $notifiable->store?->id],
        ];
    }

}
