<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\SellerWallet;
use App\Models\SellerWalletEntry;
use App\Models\SellerWithdrawal;
use App\Models\Store;
use App\Models\Transaction;
use App\Services\Marketplace\SellerWalletService;
use App\Services\Marketplace\WithdrawalService;
use Illuminate\Http\Request;

class AdminFinanceController extends Controller
{
    public function wallets()
    {
        return R::success(SellerWallet::with('store:id,name,user_id')->latest('id')->paginate(25));
    }

    public function wallet(int $storeId)
    {
        Store::findOrFail($storeId);

        return R::success(app(SellerWalletService::class)->summary($storeId));
    }

    public function entries(Request $r)
    {
        return R::success(SellerWalletEntry::when($r->filled('wallet_id'), fn ($q) => $q->where('seller_wallet_id', $r->wallet_id))->latest('id')->paginate(25));
    }

    public function buyers(Request $r)
    {
        return R::success(Transaction::with('user:id,name,email')->whereHas('user', fn ($q) => $q->where('role', 'buyer'))
            ->when($r->filled('user_id'), fn ($q) => $q->where('user_id', $r->user_id))->latest('id')->paginate(25));
    }

    public function withdrawals()
    {
        return R::success(SellerWithdrawal::with('wallet.store:id,name')->latest('id')->paginate(25));
    }

    public function updateWithdrawal(Request $r, int $id)
    {
        $data = $r->validate(['status' => 'required|in:approved,processing,completed,rejected,failed',
            'payout_reference' => 'required_if:status,completed|nullable|string|max:255', 'notes' => 'required|string|min:5|max:2000']);

        return R::success(app(WithdrawalService::class)->transition(SellerWithdrawal::findOrFail($id), $r->user(), $data));
    }
}
