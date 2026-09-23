<?php

namespace Tests\Unit;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\SellerWallet;
use App\Models\SellerWalletEntry;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Email\MarketplaceEmailService;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class MarketplaceTransactionalMailTest extends TestCase
{
    public function test_the_shared_template_renders_a_responsive_transactional_email(): void
    {
        $html = (new MarketplaceTransactionalMail(
            'Payment received', 'Payment confirmed', 'Your payment was successful.',
            ['Order number' => 'COL-20260923-000001', 'Total' => '€25.00'],
            [['name' => 'Optical frame', 'sku' => 'FRAME-1', 'quantity' => 1, 'price' => '€25.00', 'total' => '€25.00']],
            'View order', 'https://buyer.example.test/orders/1', 'Keep this email for your records.', null, 'Buyer',
        ))->render();

        $this->assertStringContainsString('VistaExpress', $html);
        $this->assertStringContainsString('COL-20260923-000001', $html);
        $this->assertStringContainsString('width=device-width', $html);
    }

    public function test_approval_and_wallet_events_use_the_shared_branded_mailer(): void
    {
        Mail::fake();
        $seller = User::factory()->make(['role' => 'seller', 'email' => 'seller@example.test']);
        $buyer = User::factory()->make(['role' => 'buyer', 'email' => 'buyer@example.test']);
        $service = app(MarketplaceEmailService::class);

        $service->sellerApproved($seller);
        $service->sellerWalletTransaction($seller, new SellerWalletEntry([
            'type' => 'warehouse_purchase', 'amount' => '-20.00', 'reference' => 'warehouse:1',
            'balances_after' => ['available_balance' => '80.00'], 'description' => 'Warehouse purchase',
        ]), new SellerWallet(['available_balance' => '80.00']));
        $service->buyerWalletTransaction($buyer, new Transaction([
            'type' => 'refund', 'amount' => '20.00', 'payment_reference' => 'refund:1', 'status' => 'success',
            'description' => 'Refund received', 'meta' => ['balance_before' => '5.00', 'balance_after' => '25.00'],
        ]));

        Mail::assertSent(MarketplaceTransactionalMail::class, 3);
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Your seller account is approved');
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Your seller wallet changed');
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Your wallet changed');
    }
}
