<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Password reset link, in Italian and inside the branded VistaExpress layout.
 *
 * Laravel's default ResetPassword notification is English only, and it builds
 * the link from a `password.reset` named route. This application has no such
 * route: both frontends host their own reset page, so the default
 * notification cannot produce a working URL. This class builds the link from
 * the buyer frontend directly and renders it through the shared brand shell.
 */
class ResetPasswordNotification extends Notification
{
    public function __construct(public string $token) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $recipient = $notifiable instanceof User ? $notifiable : null;
        $base = rtrim((string) (env('BUYER_FRONTEND_URL') ?: config('app.url')), '/');
        $url = $base.'/auth/reset-password?'.http_build_query([
            'token' => $this->token,
            'email' => $recipient?->getEmailForPasswordReset() ?: $recipient?->email,
        ]);
        $minutes = (int) config('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject(__('passwords.reset'))
            ->view('emails.password-reset', [
                'recipientName' => $recipient?->name,
                'url' => $url,
                'minutes' => $minutes,
                'appName' => config('app.name'),
            ]);
    }
}
