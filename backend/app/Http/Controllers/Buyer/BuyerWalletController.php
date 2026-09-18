<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BuyerWalletController extends Controller
{
    public function capabilities()
    {
        return ResponseHelper::success(app(\App\Services\Marketplace\BuyerWalletService::class)->capabilities());
    }

    public function developmentTopUp(Request $request)
    {
        $data = $request->validate(['amount' => 'required|numeric|min:5|max:100000', 'idempotency_key' => 'required|string|max:100']);

        return ResponseHelper::success(app(\App\Services\Marketplace\BuyerWalletService::class)->developmentTopUp($request->user(), $data['amount'], $data['idempotency_key']));
    }

    /**
     * Get wallet balance.
     */
    public function getBalance(): JsonResponse
    {
        $user = Auth::user();

        $wallet = Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'shopping_balance' => 0,
                'reward_balance' => 0,
                'referral_balance' => 0,
                'loyality_points' => 0,
                'ad_credit' => 0,
            ]
        );

        return ResponseHelper::success([
            'balance' => (float) $wallet->shopping_balance,
            'currency' => 'EUR',
        ], 'Wallet balance retrieved successfully');
    }

    /**
     * Create Stripe checkout session.
     */
    public function createCheckoutSession(Request $request): JsonResponse
    {
        $data = $request->validate(['amount' => 'required|integer|min:500|max:10000000', 'currency' => 'required|in:eur',
            'success_url' => ['required', 'string', 'max:2048', function ($attribute, $value, $fail) {
                // Stripe requires this literal placeholder, which the generic URL rule rejects.
                $url = str_replace('{CHECKOUT_SESSION_ID}', 'session', $value);
                if (! filter_var($url, FILTER_VALIDATE_URL) || ! in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'])) {
                    $fail('The success URL must be a valid HTTP(S) URL.');
                }
            }], 'cancel_url' => 'required|url|max:2048']);
        $result = app(\App\Services\Ads\WalletFundingService::class)->checkout($request->user(), $data['amount'], $data['success_url'], $data['cancel_url']);

        return ResponseHelper::success($result, 'Checkout session created');
    }

    /**
     * Get wallet transactions.
     */
    public function getTransactions(Request $request): JsonResponse
    {
        $user = Auth::user();

        $perPage = $request->get('per_page', 20);
        $page = $request->get('page', 1);

        $transactions = Transaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return ResponseHelper::success($transactions, 'Transactions retrieved successfully');
    }

    /**
     * Top up directly while the card gateway is not active, or confirm a
     * future Stripe session when one is supplied.
     */
    public function topUp(Request $request): JsonResponse
    {
        if ($request->filled('amount')) {
            $data = $request->validate([
                'amount' => 'required|numeric|min:5|max:100000',
                'idempotency_key' => 'required|string|max:100',
            ]);

            $result = app(\App\Services\Marketplace\BuyerWalletService::class)
                ->directTopUp($request->user(), $data['amount'], $data['idempotency_key']);

            return ResponseHelper::success($result, 'Wallet topped up successfully.');
        }

        $data = $request->validate(['stripe_session_id' => ['required', 'string', 'max:255', 'regex:/^cs_[a-zA-Z0-9_]+$/']]);
        $result = app(\App\Services\Ads\WalletFundingService::class)->confirm($request->user(), $data['stripe_session_id']);

        return ResponseHelper::success($result, 'Verified wallet payment');
    }

    /**
     * Withdraw from wallet.
     */
    public function withdraw(Request $request): JsonResponse
    {
        $data = $request->validate(['amount' => 'required|numeric|min:10|max:100000', 'idempotency_key' => 'required|string|max:100',
            'account_number' => 'required|string|max:100', 'account_name' => 'required|string|max:255', 'bank_name' => 'required|string|max:255']);

        return ResponseHelper::success(app(\App\Services\Marketplace\BuyerWalletService::class)->withdraw($request->user(), $data), 'Withdrawal request reserved.');
    }
}
