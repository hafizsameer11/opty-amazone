<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Stripe\Stripe;
use Stripe\Checkout\Session;

class BuyerWalletController extends Controller
{
    public function __construct()
    {
        // Set Stripe API key
        Stripe::setApiKey(env('STRIPE_SECRET_KEY'));
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
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:500', // Minimum €5.00 in cents
            'currency' => 'required|string|in:eur,usd,gbp',
            'success_url' => 'required|url',
            'cancel_url' => 'required|url',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::error('Validation failed', $validator->errors(), 422);
        }

        $user = Auth::user();

        try {
            $session = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => strtolower($request->currency),
                        'product_data' => [
                            'name' => 'Wallet Top-Up',
                            'description' => 'Add funds to your wallet',
                        ],
                        'unit_amount' => (int) $request->amount,
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                'success_url' => $request->success_url,
                'cancel_url' => $request->cancel_url,
                'customer_email' => $user->email,
                'metadata' => [
                    'user_id' => $user->id,
                    'type' => 'wallet_topup',
                ],
            ]);

            return ResponseHelper::success([
                'id' => $session->id,
                'url' => $session->url,
            ], 'Checkout session created successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error('Failed to create checkout session: ' . $e->getMessage());
        }
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
     * Top up wallet (called after Stripe success).
     */
    public function topUp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:5',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::error('Validation failed', $validator->errors(), 422);
        }

        $user = Auth::user();
        $amount = (float) $request->amount;

        try {
            DB::beginTransaction();

            // Get or create wallet
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

            // Add to balance
            $wallet->increment('shopping_balance', $amount);

            // Create transaction
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'top_up',
                'amount' => $amount,
                'status' => 'completed',
                'description' => "Wallet top-up of €{$amount}",
                'meta' => [
                    'payment_method' => 'stripe',
                    'stripe_session_id' => $request->get('stripe_session_id'),
                ],
            ]);

            DB::commit();

            return ResponseHelper::success([
                'wallet' => [
                    'balance' => (float) $wallet->fresh()->shopping_balance,
                ],
                'transaction' => $transaction,
            ], 'Wallet topped up successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to top up wallet: ' . $e->getMessage());
        }
    }

    /**
     * Withdraw from wallet.
     */
    public function withdraw(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:10',
            'account_number' => 'required|string',
            'account_name' => 'required|string',
            'bank_name' => 'required|string',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::error('Validation failed', $validator->errors(), 422);
        }

        $user = Auth::user();
        $amount = (float) $request->amount;

        try {
            DB::beginTransaction();

            // Get wallet
            $wallet = Wallet::where('user_id', $user->id)->firstOrFail();

            // Check balance
            if ($wallet->shopping_balance < $amount) {
                return ResponseHelper::error('Insufficient balance', null, 400);
            }

            // Deduct from balance
            $wallet->decrement('shopping_balance', $amount);

            // Create transaction
            $transaction = Transaction::create([
                'user_id' => $user->id,
                'type' => 'withdraw',
                'amount' => -$amount,
                'status' => 'pending',
                'description' => "Withdrawal of €{$amount} to {$request->bank_name}",
                'meta' => [
                    'account_number' => $request->account_number,
                    'account_name' => $request->account_name,
                    'bank_name' => $request->bank_name,
                ],
            ]);

            DB::commit();

            return ResponseHelper::success([
                'wallet' => [
                    'balance' => (float) $wallet->fresh()->shopping_balance,
                ],
                'transaction' => $transaction,
            ], 'Withdrawal request submitted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return ResponseHelper::error('Failed to process withdrawal: ' . $e->getMessage());
        }
    }
}

