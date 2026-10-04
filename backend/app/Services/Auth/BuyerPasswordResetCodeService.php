<?php

namespace App\Services\Auth;

use App\Models\BuyerPasswordResetCode;
use App\Models\User;
use App\Services\Email\MarketplaceEmailService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Role-scoped password recovery for the Buyer storefront.
 *
 * Mirrors SellerPasswordResetCodeService: a short-lived email code is verified
 * once, then exchanged for an equally short-lived reset token. The plaintext
 * code/token are never persisted and every state change is locked.
 */
class BuyerPasswordResetCodeService
{
    private const CODE_TTL_MINUTES = 15;
    private const RESET_TOKEN_TTL_MINUTES = 10;
    private const MAX_ATTEMPTS = 5;

    public function __construct(private MarketplaceEmailService $emails)
    {
    }

    /**
     * Always returns successfully when the email is unknown so recovery does
     * not disclose whether a buyer account exists.
     */
    public function send(string $email): void
    {
        $buyer = User::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower(trim($email))])
            ->where('role', 'buyer')
            ->first();

        if (! $buyer) {
            return;
        }

        $code = (string) random_int(100000, 999999);
        $expiresAt = now()->addMinutes(self::CODE_TTL_MINUTES);

        DB::transaction(function () use ($buyer, $code, $expiresAt): void {
            $record = BuyerPasswordResetCode::query()
                ->where('user_id', $buyer->id)
                ->lockForUpdate()
                ->first() ?? new BuyerPasswordResetCode(['user_id' => $buyer->id]);

            $record->fill([
                'email' => $buyer->email,
                'code' => Hash::make($code),
                'attempts' => 0,
                'expires_at' => $expiresAt,
                'verified_at' => null,
                'reset_token' => null,
                'reset_token_expires_at' => null,
            ]);
            $record->save();
        });

        $this->emails->buyerPasswordResetCode($buyer, $code, $expiresAt);
    }

    /**
     * The failed-attempt counter must survive the rejection, so the outcome is
     * resolved inside the transaction and the validation error is raised only
     * after the transaction commits.
     */
    public function verify(string $email, string $code): string
    {
        $outcome = DB::transaction(function () use ($email, $code): array {
            [$buyer, $record] = $this->recordFor($email);

            if ($record->expires_at->isPast()) {
                $record->delete();

                return ['error' => 'This verification code has expired. Request a new code and try again.'];
            }

            if ($record->attempts >= self::MAX_ATTEMPTS) {
                return ['error' => 'Too many incorrect code attempts. Request a new code and try again.'];
            }

            if (! Hash::check($code, $record->code)) {
                $record->increment('attempts');
                $remaining = max(0, self::MAX_ATTEMPTS - $record->attempts);

                return ['error' => $remaining > 0
                    ? "The verification code is incorrect. {$remaining} attempt" . ($remaining === 1 ? '' : 's') . ' remaining.'
                    : 'Too many incorrect code attempts. Request a new code and try again.'];
            }

            $resetToken = Str::random(64);
            $record->update([
                'verified_at' => now(),
                'reset_token' => Hash::make($resetToken),
                'reset_token_expires_at' => now()->addMinutes(self::RESET_TOKEN_TTL_MINUTES),
            ]);

            return ['token' => $resetToken];
        });

        if (isset($outcome['error'])) {
            $this->invalid($outcome['error']);
        }

        return $outcome['token'];
    }

    public function reset(string $email, string $resetToken, string $password): void
    {
        DB::transaction(function () use ($email, $resetToken, $password): void {
            [$buyer, $record] = $this->recordFor($email);

            if (! $record->verified_at || ! $record->reset_token_expires_at || $record->reset_token_expires_at->isPast()) {
                $this->invalid('Your verified reset session has expired. Request a new code and try again.');
            }

            if (! $record->reset_token || ! Hash::check($resetToken, $record->reset_token)) {
                $this->invalid('Your verified reset session is invalid. Request a new code and try again.');
            }

            $buyer->forceFill(['password' => Hash::make($password)])->save();
            $buyer->tokens()->delete();
            $record->delete();
        });
    }

    /** @return array{0: User, 1: BuyerPasswordResetCode} */
    private function recordFor(string $email): array
    {
        $buyer = User::query()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower(trim($email))])
            ->where('role', 'buyer')
            ->lockForUpdate()
            ->first();

        $record = $buyer
            ? BuyerPasswordResetCode::query()->where('user_id', $buyer->id)->lockForUpdate()->first()
            : null;

        if (! $buyer || ! $record) {
            $this->invalid('This verification code is invalid or has expired. Request a new code and try again.');
        }

        return [$buyer, $record];
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['code' => [$message]]);
    }
}