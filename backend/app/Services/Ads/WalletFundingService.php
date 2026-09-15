<?php

namespace App\Services\Ads;

use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class WalletFundingService
{
    private function client()
    {
        abort_unless(config('services.stripe.secret'), 503, 'Stripe wallet funding is not configured.');

        return Http::withToken(config('services.stripe.secret'))->asForm()->timeout(20);
    }

    public function checkout(User $user, int $amount, string $success, string $cancel): array
    {
        foreach ([$success, $cancel] as $url) {
            $origin = parse_url($url, PHP_URL_SCHEME).'://'.parse_url($url, PHP_URL_HOST);
            if ($port = parse_url($url, PHP_URL_PORT)) {
                $origin .= ':'.$port;
            }
            abort_unless(in_array($origin, array_merge(array_map('trim', config('services.stripe.return_origins', [])), app()->environment(['local', 'testing']) ? config('marketplace.development_return_origins', []) : []), true), 422, 'Unsupported checkout return origin.');
        }
        $response = $this->client()->post('https://api.stripe.com/v1/checkout/sessions', [
            'mode' => 'payment', 'payment_method_types' => ['card'], 'customer_email' => $user->email,
            'success_url' => $success, 'cancel_url' => $cancel,
            'metadata' => ['user_id' => (string) $user->id, 'type' => 'wallet_topup'],
            'line_items' => [['price_data' => ['currency' => 'eur', 'unit_amount' => $amount,
                'product_data' => ['name' => 'Wallet top-up']], 'quantity' => 1]],
        ]);
        abort_unless($response->successful(), 502, 'Payment provider could not create checkout.');

        return \Illuminate\Support\Arr::only($response->json(), ['id', 'url']);
    }

    public function confirm(User $user, string $sessionId): array
    {
        $response = $this->client()->get('https://api.stripe.com/v1/checkout/sessions/'.rawurlencode($sessionId));
        abort_unless($response->successful(), 502, 'Unable to verify payment with Stripe.');
        $session = $response->json();
        $valid = ($session['id'] ?? '') === $sessionId && ($session['payment_status'] ?? '') === 'paid'
            && ($session['status'] ?? '') === 'complete' && ($session['mode'] ?? '') === 'payment'
            && ($session['currency'] ?? '') === 'eur' && ($session['metadata']['type'] ?? '') === 'wallet_topup'
            && (string) ($session['metadata']['user_id'] ?? '') === (string) $user->id
            && is_int($session['amount_total'] ?? null) && $session['amount_total'] >= 500;
        if (! $valid) {
            throw ValidationException::withMessages(['stripe_session_id' => 'A completed EUR wallet payment belonging to this account is required.']);
        }

        return DB::transaction(function () use ($user, $session, $sessionId) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $wallet = Wallet::firstOrCreate(['user_id' => $user->id]);
            $wallet = Wallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            $reference = 'stripe:'.$sessionId;
            $existing = Transaction::where('payment_reference', $reference)->first();
            if ($existing) {
                return ['wallet' => ['balance' => (float) $wallet->shopping_balance], 'transaction' => $existing];
            }
            // Detect old records as well; never credit a historical session twice.
            if (Transaction::where('user_id', $user->id)->where('status', 'success')->where('meta->stripe_session_id', $sessionId)->exists()) {
                throw ValidationException::withMessages(['stripe_session_id' => 'This checkout was already credited.']);
            }
            $wallet->update(['shopping_balance' => AdMoney::decimal(AdMoney::cents($wallet->shopping_balance) + $session['amount_total'])]);
            $transaction = new Transaction(['user_id' => $user->id, 'type' => 'top_up', 'amount' => AdMoney::decimal($session['amount_total']),
                'status' => 'success', 'description' => 'Verified Stripe wallet top-up',
                'meta' => ['payment_method' => 'stripe', 'stripe_session_id' => $sessionId]]);
            $transaction->payment_reference = $reference;
            $transaction->save();

            return ['wallet' => ['balance' => (float) $wallet->shopping_balance], 'transaction' => $transaction];
        }, 3);
    }
}
