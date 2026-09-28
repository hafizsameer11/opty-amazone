<?php

namespace App\Services\Email;

use App\Models\EmailVerificationChallenge;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * A short-lived, single-use confirmation for an authenticated buyer changing
 * their password. It deliberately shares the hardened challenge table used by
 * registration verification, but has its own purpose so a registration OTP
 * can never authorize a password change.
 */
class PasswordChangeVerificationService
{
    private const PURPOSE = 'buyer_password_change';

    public function __construct(private MarketplaceEmailService $emails) {}

    public function send(User $buyer): void
    {
        $result = DB::transaction(function () use ($buyer): array {
            User::whereKey($buyer->id)->lockForUpdate()->firstOrFail();
            $challenge = EmailVerificationChallenge::where('user_id', $buyer->id)
                ->where('purpose', self::PURPOSE)->lockForUpdate()->first();
            $cooldown = (int) config('marketplace.email_verification_resend_seconds', 60);
            $retryAfter = $challenge?->sent_at?->copy()->addSeconds($cooldown);

            if ($retryAfter?->isFuture()) {
                throw ValidationException::withMessages([
                    'email' => ["Please wait {$retryAfter->diffInSeconds(now())} seconds before requesting another code."],
                ]);
            }

            $code = (string) random_int(100000, 999999);
            $expiresAt = now()->addMinutes((int) config('marketplace.email_verification_expiry_minutes', 15));
            EmailVerificationChallenge::updateOrCreate(
                ['user_id' => $buyer->id, 'purpose' => self::PURPOSE],
                ['code_hash' => Hash::make($code), 'attempts' => 0, 'sent_at' => now(), 'expires_at' => $expiresAt, 'verified_at' => null],
            );

            return [$code, $expiresAt];
        }, 5);

        if (! $this->emails->buyerPasswordChangeCode($buyer, $result[0], $result[1])) {
            EmailVerificationChallenge::where('user_id', $buyer->id)->where('purpose', self::PURPOSE)
                ->update(['sent_at' => now()->subSeconds((int) config('marketplace.email_verification_resend_seconds', 60))]);
            throw new \RuntimeException('Password change email delivery failed.');
        }
    }

    public function verify(User $buyer, string $code): void
    {
        $error = DB::transaction(function () use ($buyer, $code): ?string {
            User::whereKey($buyer->id)->lockForUpdate()->firstOrFail();
            $challenge = EmailVerificationChallenge::where('user_id', $buyer->id)
                ->where('purpose', self::PURPOSE)->lockForUpdate()->first();

            if (! $challenge || ! $challenge->expires_at->isFuture()) {
                return 'This verification code has expired. Request a new code and try again.';
            }
            if ($challenge->attempts >= (int) config('marketplace.email_verification_max_attempts', 5)) {
                return 'Too many incorrect attempts. Request a new verification code.';
            }
            if (! Hash::check($code, $challenge->code_hash)) {
                $challenge->increment('attempts');
                return 'The verification code is incorrect.';
            }

            $challenge->update(['verified_at' => now()]);
            return null;
        }, 5);

        if ($error) throw ValidationException::withMessages(['code' => [$error]]);
    }

    /** Consume the verified challenge atomically so it cannot authorize two resets. */
    public function consume(User $buyer): void
    {
        $error = DB::transaction(function () use ($buyer): ?string {
            $challenge = EmailVerificationChallenge::where('user_id', $buyer->id)
                ->where('purpose', self::PURPOSE)->lockForUpdate()->first();

            if (! $challenge || ! $challenge->verified_at || ! $challenge->expires_at->isFuture()) {
                return 'Verify the code sent to your email before setting a new password.';
            }

            $challenge->delete();
            return null;
        }, 5);

        if ($error) throw ValidationException::withMessages(['code' => [$error]]);
    }
}
