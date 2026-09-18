<?php

namespace App\Services\Notifications;

use App\Models\User;
use App\Notifications\MarketplaceNotification;

class MarketplaceNotificationService
{
    public function send(
        ?User $user,
        string $event,
        string $title,
        string $message,
        ?string $url = null,
        array $context = [],
    ): void {
        if (! $user || ! $user->exists) {
            return;
        }

        $user->notify(new MarketplaceNotification($event, $title, $message, $url, $context));
    }

    public function sendToAdmins(string $event, string $title, string $message, ?string $url = null, array $context = []): void
    {
        User::where('role', 'admin')->get()->each(
            fn (User $admin) => $this->send($admin, $event, $title, $message, $url, $context)
        );
    }
}
