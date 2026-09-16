<?php

namespace App\Services\Marketplace;

use App\Models\SellerWalletEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SellerWalletFundingService
{
    public function __construct(private SellerWalletService $wallets) {}

    public function fundingEnabled(): bool
    {
        return (bool) config('marketplace.seller_wallet_top_up_enabled');
    }

    public function topUp(User $seller, mixed $amount, string $idempotencyKey): array
    {
        abort_unless($seller->isSeller() && $seller->store, 403);
        abort_unless($this->fundingEnabled(), 403, 'Wallet funding is currently unavailable.');
        $cents = Money::cents($amount);
        if ($cents < 500 || $cents > config('marketplace.top_up_max_cents')) {
            throw ValidationException::withMessages(['amount' => 'Top-up must be between EUR 5 and EUR 100,000.']);
        }

        return DB::transaction(function () use ($seller, $cents, $idempotencyKey) {
            $wallet = $this->wallets->locked($seller->store->id);
            $reference = "seller-wallet-top-up:{$wallet->id}:{$idempotencyKey}";
            $existing = SellerWalletEntry::where('reference', $reference)->first();
            if ($existing) {
                if (Money::cents($existing->amount) !== $cents) {
                    throw ValidationException::withMessages(['idempotency_key' => 'This key was already used for a different amount.']);
                }

                return ['wallet' => $wallet->fresh(), 'transaction' => $existing];
            }
            $entry = $this->wallets->entry($wallet, $reference, 'seller_wallet_top_up', $cents,
                ['available_balance' => $cents, 'top_up_total' => $cents], null, null, null,
                'Seller wallet top-up', ['payment_method' => 'manual']);

            return ['wallet' => $wallet->fresh(), 'transaction' => $entry];
        }, 5);
    }
}
