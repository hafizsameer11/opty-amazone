<?php

namespace App\Services\Marketplace;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Notifications\MarketplaceNotificationService;
use App\Services\Email\MarketplaceEmailService;
use Illuminate\Support\Facades\DB;

class BuyerWalletService
{
    public function developmentEnabled(): bool
    {
        // Direct funding is a development/testing aid. Stripe availability must
        // not block it in those environments, but production must remain safe.
        return app()->environment(['local', 'testing']) && (bool) config('marketplace.development_top_up');
    }

    public function capabilities(): array
    {
        return ['development_top_up' => $this->developmentEnabled(), 'stripe_available' => (bool) config('services.stripe.secret'),
            'order_card_available' => false, 'currency' => 'EUR'];
    }

    public function locked(User $user): Wallet
    {
        User::whereKey($user->id)->lockForUpdate()->firstOrFail();
        $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);

        return Wallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
    }

    // Invoked inside the caller's transaction so ledger and financial state commit together.
    public function change(User $user, int $cents, string $reference, string $type, array $meta = []): Transaction
    {
        abort_unless(DB::transactionLevel() > 0, 500);
        $wallet = $this->locked($user);
        if ($existing = Transaction::where('payment_reference', $reference)->first()) {
            abort_unless($existing->user_id === $user->id && Money::cents($existing->amount) === $cents, 409, 'Idempotency key was already used for another amount.');

            return $existing;
        }
        $balanceBefore = Money::decimal(Money::cents($wallet->shopping_balance));
        $balance = Money::cents($wallet->shopping_balance) + $cents;
        // Referral reversals are an explicit, auditable recovery obligation. They may
        // take a wallet below zero so a later top-up repays the reward; all normal
        // wallet operations retain the existing insufficient-funds protection.
        $allowNegative = (bool) ($meta['allow_negative_balance'] ?? false);
        abort_if($balance < 0 && ! $allowNegative, 422, 'Insufficient wallet balance.');
        unset($meta['allow_negative_balance']);
        $wallet->update(['shopping_balance' => Money::decimal($balance)]);

        $transaction = Transaction::create(['user_id' => $user->id, 'payment_reference' => $reference,
            'type' => $type, 'amount' => Money::decimal($cents), 'status' => 'success',
            'description' => str_replace('_', ' ', ucfirst($type)), 'meta' => $meta + ['balance_before' => $balanceBefore, 'balance_after' => Money::decimal($balance)]]);

        $labels = [
            'top_up' => ['Ricarica del wallet effettuata', 'Il tuo wallet è stato accreditato con successo.', 'wallet.top_up'],
            'withdraw' => ['Prelievo richiesto', 'La richiesta di prelievo dal wallet è stata registrata.', 'wallet.withdrawal'],
            'order_payment' => ['Pagamento completato', 'Il pagamento del tuo ordine è stato completato.', 'wallet.order_payment'],
            'refund' => ['Rimborso ricevuto', 'Un rimborso è stato accreditato sul tuo wallet.', 'wallet.refund'],
            'referral_reward' => ['Ricompensa referral ricevuta', 'Una ricompensa referral è stata accreditata sul tuo wallet.', 'referral.reward'],
            'referral_reward_reversal' => ['Ricompensa referral stornata', 'Una ricompensa referral è stata stornata dal tuo wallet.', 'referral.reversal'],
        ];
        [$title, $message, $event] = $labels[$type] ?? ['Transazione sul wallet', 'Il saldo del tuo wallet è cambiato.', 'wallet.transaction'];
        app(MarketplaceNotificationService::class)->send($user, $event, $title, $message, '/profile?tab=wallet', [
            'transaction_id' => $transaction->id,
            'transaction_type' => $type,
            'amount' => (float) $transaction->amount,
        ]);
        app(MarketplaceEmailService::class)->buyerWalletTransaction($user, $transaction);

        return $transaction;
    }

    public function developmentTopUp(User $user, mixed $amount, string $key): array
    {
        abort_unless($user->isBuyer(), 403);
        abort_unless($this->developmentEnabled(), 403, 'Development wallet funding is disabled.');
        $cents = Money::cents($amount);
        abort_unless($cents >= 500 && $cents <= config('marketplace.top_up_max_cents'), 422, 'Top-up must be between EUR 5 and EUR 100,000.');

        return DB::transaction(function () use ($user, $cents, $key) {
            $transaction = $this->change($user, $cents, 'development:'.$user->id.':'.$key, 'top_up', ['payment_method' => 'development']);

            return ['wallet' => ['balance' => (float) $user->wallet()->first()->shopping_balance], 'transaction' => $transaction];
        }, 5);
    }

    /**
     * Credit a buyer wallet directly while the normal card gateway is not in use.
     * This is the regular Buyer Wallet top-up path and has no Stripe gate.
     */
    public function directTopUp(User $user, mixed $amount, string $key): array
    {
        abort_unless($user->isBuyer(), 403);
        $cents = Money::cents($amount);
        abort_unless($cents >= 500 && $cents <= config('marketplace.top_up_max_cents'), 422, 'Top-up must be between EUR 5 and EUR 100,000.');

        return DB::transaction(function () use ($user, $cents, $key) {
            $transaction = $this->change($user, $cents, 'buyer-top-up:'.$user->id.':'.$key, 'top_up', ['payment_method' => 'wallet_top_up']);

            return ['wallet' => ['balance' => (float) $user->wallet()->first()->shopping_balance], 'transaction' => $transaction];
        }, 5);
    }

    public function withdraw(User $buyer, array $data): array
    {
        abort_unless($buyer->isBuyer(), 403);

        return DB::transaction(function () use ($buyer, $data) {
            $reference = 'buyer-withdraw:'.$buyer->id.':'.$data['idempotency_key'];
            $this->locked($buyer);
            $details = array_intersect_key($data, array_flip(['account_number', 'account_name', 'bank_name']));
            ksort($details);
            $fingerprint = hash('sha256', json_encode($details));
            $existing = Transaction::where('payment_reference', $reference)->first();
            abort_if($existing && ($existing->meta['fingerprint'] ?? '') !== $fingerprint, 409, 'Withdrawal details do not match the original request.');
            $transaction = $this->change($buyer, -Money::cents($data['amount']), $reference, 'withdraw',
                $details + ['fingerprint' => $fingerprint, 'payment_method' => 'bank']);
            if (! $existing) {
                $transaction->update(['status' => 'pending']);
            }

            return ['wallet' => ['balance' => (float) $buyer->wallet()->first()->shopping_balance], 'transaction' => $transaction];
        }, 5);
    }
}
