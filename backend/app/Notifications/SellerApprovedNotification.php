<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SellerApprovedNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
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

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your VistaExpress seller account is approved')
            ->greeting('Congratulations, ' . ($notifiable->name ?: 'seller') . '!')
            ->line('Your VistaExpress seller application has been approved.')
            ->line('Complete your Store Profile before adding products and accepting orders.')
            ->action('Complete Store Profile', rtrim((string) config('app.url'), '/') . '/dashboard?setup=1')
            ->line('Thank you for joining the optical marketplace.');
    }
}
