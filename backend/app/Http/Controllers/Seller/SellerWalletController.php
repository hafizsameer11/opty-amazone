<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper as R;
use App\Http\Controllers\Controller;
use App\Models\SellerWallet;
use App\Services\Marketplace\SellerWalletFundingService;
use App\Services\Marketplace\SellerWalletService;
use App\Services\Marketplace\WithdrawalService;
use Illuminate\Http\Request;

class SellerWalletController extends Controller
{
    private function storeId(): int
    {
        abort_unless(auth()->user()->store, 404, 'Store not found.');

        return auth()->user()->store->id;
    }

    public function show()
    {
        return R::success(app(SellerWalletService::class)->summary($this->storeId()));
    }

    public function transactions(Request $r)
    {
        app(SellerWalletService::class)->summary($this->storeId());

        return R::success(SellerWallet::where('store_id', $this->storeId())->firstOrFail()->entries()
            ->with('campaign:id,name,status')->latest('id')->paginate(25));
    }

    public function withdrawals(Request $r)
    {
        app(SellerWalletService::class)->summary($this->storeId());

        return R::success(SellerWallet::where('store_id', $this->storeId())->firstOrFail()->withdrawals()->latest('id')->paginate(25));
    }

    public function capabilities()
    {
        return R::success(['wallet_top_up' => app(SellerWalletFundingService::class)->fundingEnabled(), 'currency' => 'EUR']);
    }

    public function topUp(Request $r)
    {
        $data = $r->validate(['amount' => 'required|numeric|min:5|max:100000', 'idempotency_key' => 'required|uuid']);

        return R::success(app(SellerWalletFundingService::class)->topUp($r->user(), $data['amount'], $data['idempotency_key']), 'Funds were added to your Seller Wallet.');
    }

    public function withdraw(Request $r)
    {
        $data = $r->validate(['amount' => 'required|numeric|min:10|max:1000000', 'idempotency_key' => 'required|string|max:100',
            'bank_details' => 'required|array:account_name,account_number,bank_name',
            'bank_details.account_name' => 'required|string|max:255', 'bank_details.account_number' => 'required|string|max:100',
            'bank_details.bank_name' => 'required|string|max:255']);

        return R::success(app(WithdrawalService::class)->request($r->user(), $data), 'Withdrawal reserved.', 201);
    }
}
