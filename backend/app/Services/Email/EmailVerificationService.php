<?php

namespace App\Services\Email;

use App\Models\EmailVerificationChallenge;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class EmailVerificationService
{
    /**
     * Verification challenges are stored per user and purpose, so a buyer and a
     * seller can each hold exactly one live code without colliding.
     */
    public const PURPOSE_BUYER = 'buyer_registration';

    public const PURPOSE_SELLER = 'seller_registration';

    public function __construct(private MarketplaceEmailService $emails) {}

    public function send(User $user, string $purpose = self::PURPOSE_BUYER): void
    {
        if ($user->hasVerifiedEmail()) return;
        $result = DB::transaction(function () use ($user, $purpose): array {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $challenge = EmailVerificationChallenge::where('user_id', $user->id)->where('purpose', $purpose)->lockForUpdate()->first();
            $retryAfter = $challenge?->sent_at?->addSeconds((int) config('marketplace.email_verification_resend_seconds', 60));
            if ($retryAfter?->isFuture()) {
                throw ValidationException::withMessages(['email' => ["Please wait {$retryAfter->diffInSeconds(now())} seconds before requesting another code."]]);
            }
            $code = (string) random_int(100000, 999999);
            $expiresAt = now()->addMinutes((int) config('marketplace.email_verification_expiry_minutes', 15));
            EmailVerificationChallenge::updateOrCreate(['user_id' => $user->id, 'purpose' => $purpose], [
                'code_hash' => Hash::make($code), 'attempts' => 0, 'sent_at' => now(), 'expires_at' => $expiresAt, 'verified_at' => null,
            ]);
            return [$code, $expiresAt];
        }, 5);
        if (! $this->deliverCode($user, $purpose, $result[0], $result[1])) {
            // Do not make the recipient wait out the resend cooldown when delivery
            // failed before any message left the application.
            EmailVerificationChallenge::where('user_id', $user->id)->where('purpose', $purpose)
                ->update(['sent_at' => now()->subSeconds((int) config('marketplace.email_verification_resend_seconds', 60))]);
            throw new \RuntimeException('Verification email delivery failed.');
        }
    }

    public function verify(User $user, string $code, string $purpose = self::PURPOSE_BUYER): User
    {
        $result = DB::transaction(function () use ($user, $code, $purpose): array {
            $lockedUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            if ($lockedUser->hasVerifiedEmail()) return ['verified' => false];
            $challenge = EmailVerificationChallenge::where('user_id', $user->id)->where('purpose', $purpose)->lockForUpdate()->first();
            if (! $challenge || ! $challenge->expires_at->isFuture()) {
                return ['error' => 'This verification code has expired. Request a new code and try again.'];
            }
            if ($challenge->attempts >= (int) config('marketplace.email_verification_max_attempts', 5)) {
                return ['error' => 'Too many incorrect attempts. Request a new verification code.'];
            }
            if (! Hash::check($code, $challenge->code_hash)) {
                $challenge->increment('attempts');
                return ['error' => 'The verification code is incorrect.'];
            }
            $lockedUser->markEmailAsVerified();
            $challenge->update(['verified_at' => now()]);
            return ['verified' => true];
        }, 5);
        if (isset($result['error'])) {
            throw ValidationException::withMessages(['code' => [$result['error']]]);
        }
        $verified = $user->fresh();
        if ($result['verified']) $this->announceVerified($verified, $purpose);
        return $verified;
    }

    private function deliverCode(User $user, string $purpose, string $code, Carbon $expiresAt): bool
    {
        return $purpose === self::PURPOSE_SELLER
            ? $this->emails->sellerVerificationCode($user, $code, $expiresAt)
            : $this->emails->buyerVerificationCode($user, $code, $expiresAt);
    }

    private function announceVerified(User $user, string $purpose): void
    {
        if ($purpose === self::PURPOSE_SELLER) {
            $this->emails->sellerEmailVerified($user);

            return;
        }
        $this->emails->buyerWelcome($user);
    }
}