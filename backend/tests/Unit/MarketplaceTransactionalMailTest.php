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
            'Pagamento ricevuto', 'Pagamento confermato', 'Il tuo pagamento è andato a buon fine.',
            ['Numero ordine' => 'COL-20260923-000001', 'Totale' => '€25,00'],
            [['name' => 'Montatura ottica', 'sku' => 'FRAME-1', 'quantity' => 1, 'price' => '€25,00', 'total' => '€25,00']],
            "Visualizza l'ordine", 'https://buyer.example.test/orders/1', 'Conserva questa email per i tuoi archivi.', null, 'Acquirente',
        ))->render();

        $this->assertStringContainsString('VistaExpress', $html);
        $this->assertStringContainsString('COL-20260923-000001', $html);
        $this->assertStringContainsString('width=device-width', $html);
        $this->assertStringContainsString('lang="it"', $html);
        $this->assertStringContainsString('Articoli dell\'ordine', $html);
        $this->assertStringContainsString('Questa è una notifica automatica', $html);
        $this->assertStringNotContainsString('Order items', $html);
        $this->assertStringNotContainsString('automated VistaExpress notification', $html);
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
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Il tuo account venditore è stato approvato');
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Il tuo wallet venditore è cambiato');
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Il tuo wallet è cambiato');
    }
}
