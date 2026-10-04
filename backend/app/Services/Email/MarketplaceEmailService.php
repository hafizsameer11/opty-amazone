<?php

namespace App\Services\Email;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\Order;
use App\Models\SellerWallet;
use App\Models\SellerWalletEntry;
use App\Models\StoreOrder;
use App\Models\Store;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * One delivery point for every marketplace email.  Individual features only
 * supply event data; SMTP configuration and the brand layout stay central.
 */
class MarketplaceEmailService
{
    /**
     * Italian labels for the stored enum values that are rendered inside
     * emails. Any key not listed falls back to a readable form of the raw
     * value, so a newly added status can never render as an empty cell.
     */
    private const STATUS_LABELS = [
        // Order status
        'pending' => 'In sospeso',
        'awaiting_payment' => 'In attesa di pagamento',
        'accepted' => 'Accettato',
        'processing' => 'In preparazione',
        'out_for_delivery' => 'In consegna',
        'delivered' => 'Consegnato',
        'rejected' => 'Rifiutato',
        'cancelled' => 'Annullato',
        'disputed' => 'In contestazione',
        'refunded' => 'Rimborsato',
        'failed' => 'Non riuscito',
        'expired' => 'Scaduto',
        // Payment status
        'paid' => 'Pagato',
        'unpaid' => 'Non pagato',
        'partially_paid' => 'Parzialmente pagato',
        'success' => 'Riuscita',
        'pending_capture' => 'In attesa di addebito',
        // Transaction / ledger types
        'top_up' => 'Ricarica',
        'topup' => 'Ricarica',
        'refund' => 'Rimborso',
        'withdrawal' => 'Prelievo',
        'sale' => 'Vendita',
        'order_payout' => 'Bonifico ordine',
        'warehouse_purchase' => 'Acquisto in magazzino',
        'ad_spend' => 'Spesa pubblicitaria',
        'referral_reward' => 'Ricompensa referral',
        'commission' => 'Commissione',
        'platform_fee' => 'Commissione piattaforma',
        'adjustment' => 'Rettifica',
        'reward' => 'Ricompensa',
        'deposit' => 'Deposito',
        'development' => 'Sviluppo',
        'reservation' => 'Prenotazione',
        'release' => 'Rilascio',
        // Generic
        'active' => 'Attivo',
        'inactive' => 'Inattivo',
        'completed' => 'Completata',
        'complete' => 'Completata',
        'archived' => 'Archiviato',
        'confirmed' => 'Confermato',
        'shipped' => 'Spedito',
        'scheduled' => 'Programmato',
        'draft' => 'Bozza',
        'succeeded' => 'Riuscita',
    ];

    public function buyerVerificationCode(User $buyer, string $code, Carbon $expiresAt): bool
    {
        return $this->send($buyer, new MarketplaceTransactionalMail(
            'Verifica il tuo indirizzo email VistaExpress',
            'Verifica il tuo indirizzo email',
            'Utilizza il codice di verifica qui sotto per completare la creazione del tuo account acquirente.',
            ['Il codice scade' => $expiresAt->timezone(config('app.timezone'))->locale('it')->translatedFormat('j M Y, H:i'), 'Validità' => '15 minuti'],
            ctaLabel: 'Apri VistaExpress', ctaUrl: $this->buyerUrl('/auth/verify-email'),
            notice: 'Per la tua sicurezza, non condividere mai questo codice con nessuno.', code: $code, recipientName: $buyer->name,
        ));
    }

    public function buyerWelcome(User $buyer): void
    {
        $this->send($buyer, new MarketplaceTransactionalMail(
            'Benvenuto su VistaExpress', 'Benvenuto su VistaExpress',
            'Il tuo indirizzo email è stato verificato e il tuo account acquirente è pronto. Scopri i prodotti ottici, segui i negozi e tieni tutti i tuoi ordini in un unico posto.',
            ctaLabel: 'Inizia a comprare', ctaUrl: $this->buyerUrl('/'), recipientName: $buyer->name,
        ));
    }

    public function buyerPasswordChangeCode(User $buyer, string $code, Carbon $expiresAt): bool
    {
        return $this->send($buyer, new MarketplaceTransactionalMail(
            'Conferma il cambio password del tuo account VistaExpress', 'Conferma il cambio password',
            'Utilizza il codice di verifica qui sotto per confermare che desideri cambiare la password del tuo account acquirente.',
            ['Il codice scade' => $expiresAt->timezone(config('app.timezone'))->locale('it')->translatedFormat('j M Y, H:i'), 'Validità' => '15 minuti'],
            ctaLabel: 'Apri VistaExpress', ctaUrl: $this->buyerUrl('/profile/change-password'),
            notice: 'Per la tua sicurezza, non condividere mai questo codice con nessuno.', code: $code, recipientName: $buyer->name,
        ));
    }

    public function buyerPasswordResetCode(User $buyer, string $code, Carbon $expiresAt): bool
    {
        return $this->send($buyer, new MarketplaceTransactionalMail(
            'Reimposta la password del tuo account VistaExpress',
            'Conferma la reimpostazione della password',
            'Utilizza il codice di verifica qui sotto per continuare a reimpostare la password del tuo account acquirente.',
            ['Il codice scade' => $expiresAt->timezone(config('app.timezone'))->locale('it')->translatedFormat('j M Y, H:i'), 'Validità' => '15 minuti'],
            ctaLabel: 'Apri VistaExpress', ctaUrl: $this->buyerUrl('/auth/reset-password'),
            notice: 'Per la tua sicurezza, non condividere mai questo codice con nessuno.', code: $code, recipientName: $buyer->name,
        ));
    }

    public function sellerApproved(User $seller): void
    {
        $this->send($seller, new MarketplaceTransactionalMail(
            'Il tuo account venditore VistaExpress è stato approvato', 'Il tuo account venditore è stato approvato',
            'Benvenuto su VistaExpress. Il tuo negozio può ora essere completato e preparato per la vendita.',
            ['Prossimo passo' => 'Completa il profilo del tuo negozio', 'Poi' => 'Aggiungi i prodotti e inizia a gestire gli ordini'],
            ctaLabel: 'Apri il Seller Hub', ctaUrl: $this->sellerUrl('/dashboard?setup=1'), recipientName: $seller->name,
        ));
    }

    /** Moderation emails share the same branded transactional layout as orders. */
    public function storeWarning(Store $store, string $reason, ?string $notes = null): void
    {
        $store->loadMissing('user');
        $this->send($store->user, new MarketplaceTransactionalMail(
            'Avviso relativo al tuo negozio VistaExpress', 'È stato emesso un avviso per il tuo negozio',
            'Il team VistaExpress ha ricevuto una segnalazione o ha rilevato un problema che richiede la tua attenzione. Il negozio resta attivo, ma ti chiediamo di intervenire tempestivamente.',
            array_filter(['Negozio' => $store->name, 'Motivo' => $reason, 'Note dell’amministrazione' => $notes]),
            ctaLabel: 'Apri il Seller Hub', ctaUrl: $this->sellerUrl('/dashboard'), recipientName: $store->user?->name,
        ));
    }

    public function sellerRejected(Store $store, string $reason): void
    {
        $store->loadMissing('user');
        $this->send($store->user, new MarketplaceTransactionalMail(
            'Aggiornamento sulla richiesta del tuo negozio VistaExpress', 'La richiesta del tuo negozio non è stata approvata',
            'Il team VistaExpress ha esaminato la richiesta di apertura del tuo negozio e non ha potuto approvarla. Puoi correggere i dettagli indicati e presentare di nuovo la richiesta.',
            ['Negozio' => $store->name, 'Motivo' => $reason],
            ctaLabel: 'Apri il Seller Hub', ctaUrl: $this->sellerUrl('/auth/pending-approval'), recipientName: $store->user?->name,
        ));
    }

    public function storeSuspended(Store $store, string $reason, ?string $notes = null): void
    {
        $store->loadMissing('user');
        $this->send($store->user, new MarketplaceTransactionalMail(
            'Il tuo negozio VistaExpress è stato sospeso', 'Il tuo negozio è stato sospeso',
            'Il tuo negozio e i suoi prodotti non sono attualmente visibili agli acquirenti. Puoi aprire il Seller Hub per inviare una richiesta di riesame al team amministrativo.',
            array_filter(['Negozio' => $store->name, 'Motivo' => $reason, 'Note dell’amministrazione' => $notes]),
            ctaLabel: 'Richiedi il riesame', ctaUrl: $this->sellerUrl('/auth/store-suspended'), recipientName: $store->user?->name,
        ));
    }

    public function storeRemoved(Store $store, string $reason, ?string $notes = null): void
    {
        $store->loadMissing('user');
        $this->send($store->user, new MarketplaceTransactionalMail(
            'Il tuo negozio VistaExpress è stato rimosso dalla vendita', 'Il tuo negozio è stato rimosso dalla vendita',
            'Il negozio e i suoi prodotti non sono più disponibili agli acquirenti. Puoi inviare una richiesta di riesame se ritieni che questa decisione debba essere rivalutata.',
            array_filter(['Negozio' => $store->name, 'Motivo' => $reason, 'Note dell’amministrazione' => $notes]),
            ctaLabel: 'Richiedi il riesame', ctaUrl: $this->sellerUrl('/auth/store-suspended'), recipientName: $store->user?->name,
        ));
    }

    public function storeReinstated(Store $store, ?string $notes = null): void
    {
        $store->loadMissing('user');
        $this->send($store->user, new MarketplaceTransactionalMail(
            'Il tuo negozio VistaExpress è stato riattivato', 'Il tuo negozio è di nuovo attivo',
            'La richiesta di riesame è stata approvata. Il tuo negozio e i prodotti idonei sono nuovamente disponibili sulla piattaforma.',
            array_filter(['Negozio' => $store->name, 'Note dell’amministrazione' => $notes]),
            ctaLabel: 'Apri il Seller Hub', ctaUrl: $this->sellerUrl('/dashboard'), recipientName: $store->user?->name,
        ));
    }

    /**
     * Registration is shared by the web Seller Hub and the mobile app, so the
     * confirmation belongs at this service boundary rather than either UI.
     */
    public function sellerRegistered(User $seller): void
    {
        $this->send($seller, new MarketplaceTransactionalMail(
            'Benvenuto nel Seller Hub di VistaExpress', 'Benvenuto nel Seller Hub di VistaExpress',
            'Il tuo account venditore è stato creato. Completa i dati del tuo negozio e ti scriveremo di nuovo quando il tuo account sarà approvato.',
            ['Prossimo passo' => 'Completa la verifica del negozio', 'Stato dell\'account' => 'In attesa di approvazione'],
            ctaLabel: 'Apri il Seller Hub', ctaUrl: $this->sellerUrl('/dashboard'), recipientName: $seller->name,
        ));
    }

    public function sellerVerificationCode(User $seller, string $code, Carbon $expiresAt): bool
    {
        return $this->send($seller, new MarketplaceTransactionalMail(
            'Verifica il tuo indirizzo email VistaExpress',
            'Verifica il tuo indirizzo email',
            'Utilizza il codice di verifica qui sotto per completare la creazione del tuo account venditore.',
            ['Il codice scade' => $expiresAt->timezone(config('app.timezone'))->locale('it')->translatedFormat('j M Y, H:i'), 'Validità' => '15 minuti'],
            ctaLabel: 'Apri il Seller Hub', ctaUrl: $this->sellerUrl('/auth/verify-email'),
            notice: 'Per la tua sicurezza, non condividere mai questo codice con nessuno.', code: $code, recipientName: $seller->name,
        ));
    }

    public function sellerEmailVerified(User $seller): void
    {
        $this->send($seller, new MarketplaceTransactionalMail(
            'Email verificata', 'Email verificata',
            'Il tuo indirizzo email è stato verificato. Ora puoi completare i dati del tuo negozio e iniziare a vendere su VistaExpress.',
            ['Prossimo passo' => 'Invia i dati aziendali', 'Stato dell\'account' => 'Email verificata'],
            ctaLabel: 'Completa i dati del negozio', ctaUrl: $this->sellerUrl('/auth/verification'), recipientName: $seller->name,
        ));
    }

    public function sellerPasswordResetCode(User $seller, string $code, Carbon $expiresAt): bool
    {
        return $this->send($seller, new MarketplaceTransactionalMail(
            'Reimposta la password del tuo Seller Hub VistaExpress',
            'Conferma la reimpostazione della password',
            'Utilizza il codice di verifica qui sotto per continuare a reimpostare la password del tuo account Seller Hub.',
            [
                'Il codice scade' => $expiresAt->timezone(config('app.timezone'))->locale('it')->translatedFormat('j M Y, H:i'),
                'Validità' => '15 minuti',
            ],
            ctaLabel: 'Apri il Seller Hub',
            ctaUrl: $this->sellerUrl('/auth/reset-password'),
            notice: 'Per la tua sicurezza, non condividere mai questo codice con nessuno.',
            code: $code,
            recipientName: $seller->name,
        ));
    }

    /** Send the authenticated seller a one-time code before changing a password. */
    public function sellerPasswordChangeCode(User $seller, string $code, Carbon $expiresAt): bool
    {
        return $this->send($seller, new MarketplaceTransactionalMail(
            'Conferma il cambio password del tuo Seller Hub VistaExpress',
            'Conferma il cambio password',
            'Utilizza il codice di verifica qui sotto per confermare che desideri cambiare la password del tuo account Seller Hub.',
            [
                'Il codice scade' => $expiresAt->timezone(config('app.timezone'))->locale('it')->translatedFormat('j M Y, H:i'),
                'Validità' => '15 minuti',
            ],
            ctaLabel: 'Apri il Seller Hub',
            ctaUrl: $this->sellerUrl('/profile/change-password'),
            notice: 'Per la tua sicurezza, non condividere mai questo codice con nessuno.',
            code: $code,
            recipientName: $seller->name,
        ));
    }

    public function orderPlacedBuyer(Order $order): void
    {
        $order->loadMissing('user', 'storeOrders.items', 'storeOrders.store');
        $this->send($order->user, new MarketplaceTransactionalMail(
            "Ordine {$order->order_no} ricevuto", 'Grazie per il tuo ordine',
            'Abbiamo ricevuto il tuo ordine. Ogni negozio esaminerà i propri articoli e fornirà l\'eventuale preventivo di spedizione.',
            $this->orderDetails($order), $this->items($order->storeOrders->flatMap->items),
            'Visualizza i tuoi ordini', $this->buyerUrl("/orders/{$order->id}"), recipientName: $order->user?->name,
        ));
    }

    public function orderPlacedSeller(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store.user', 'items');
        $buyer = $storeOrder->order?->user;
        $this->send($storeOrder->store?->user, new MarketplaceTransactionalMail(
            "Nuovo ordine {$storeOrder->order?->order_no}", 'Un acquirente ha effettuato un ordine',
            'Un nuovo ordine è pronto per la tua revisione. Aggiungi un preventivo di spedizione quando sei pronto.',
            $this->storeOrderDetails($storeOrder) + [
                'Acquirente' => $buyer?->name, 'Email dell\'acquirente' => $buyer?->email, 'Telefono dell\'acquirente' => $buyer?->phone,
                'Indirizzo di consegna' => $this->address($storeOrder),
            ], $this->items($storeOrder->items), 'Rivedi l\'ordine', $this->sellerUrl("/orders/{$storeOrder->id}"), recipientName: $storeOrder->store?->user?->name,
        ));
    }

    public function shippingFeeAdded(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store', 'items');
        $this->send($storeOrder->order?->user, new MarketplaceTransactionalMail(
            "Preventivo di spedizione aggiunto per l'ordine {$storeOrder->order?->order_no}", 'Il tuo ordine è pronto per il pagamento',
            'Il venditore ha aggiunto il costo di spedizione. Controlla il totale aggiornato e completa il pagamento per iniziare la preparazione.',
            $this->storeOrderDetails($storeOrder), $this->items($storeOrder->items),
            'Controlla e paga', $this->buyerUrl("/store-orders/{$storeOrder->id}"), recipientName: $storeOrder->order?->user?->name,
        ));
    }

    public function paymentReceivedSeller(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store.user', 'items', 'payment');
        $this->send($storeOrder->store?->user, new MarketplaceTransactionalMail(
            "Pagamento ricevuto per l'ordine {$storeOrder->order?->order_no}", 'Pagamento dell\'acquirente confermato',
            'L\'acquirente ha effettuato il pagamento. I fondi sono conservati in modo sicuro mentre completi questo ordine.',
            $this->storeOrderDetails($storeOrder) + ['Stato del pagamento' => 'Pagato'], $this->items($storeOrder->items),
            'Gestisci la preparazione', $this->sellerUrl("/orders/{$storeOrder->id}"), recipientName: $storeOrder->store?->user?->name,
        ));
    }

    public function paymentReceiptBuyer(StoreOrder $storeOrder): void
    {
        $storeOrder->loadMissing('order.user', 'store', 'items');
        $this->send($storeOrder->order?->user, new MarketplaceTransactionalMail(
            "Pagamento confermato per l'ordine {$storeOrder->order?->order_no}", 'Il tuo pagamento è andato a buon fine',
            'Il tuo pagamento è stato confermato. Il venditore può ora preparare il tuo ordine per la consegna.',
            $this->storeOrderDetails($storeOrder), $this->items($storeOrder->items),
            'Segui il tuo ordine', $this->buyerUrl("/store-orders/{$storeOrder->id}"), recipientName: $storeOrder->order?->user?->name,
        ));
    }

    public function deliveryCodeRequested(StoreOrder $storeOrder, string $code): void
    {
        $storeOrder->loadMissing('order.user', 'store');
        $this->send($storeOrder->order?->user, new MarketplaceTransactionalMail(
            "Codice di consegna richiesto per l'ordine {$storeOrder->order?->order_no}", 'Condividi il tuo codice solo dopo la consegna',
            'Il venditore ha richiesto il tuo codice di conferma della consegna. Forniscilo al venditore solo dopo aver ricevuto l\'ordine e aver verificato che sia corretto.',
            $this->storeOrderDetails($storeOrder), ctaLabel: 'Apri i dettagli dell\'ordine', ctaUrl: $this->buyerUrl("/store-orders/{$storeOrder->id}"),
            notice: 'Non condividere questo codice prima di aver ricevuto l\'ordine.', code: $code, recipientName: $storeOrder->order?->user?->name,
        ));
    }

    /** @param array<string, string|int|float|null> $details */
    public function reviewSubmitted(User $seller, string $reviewType, array $details): void
    {
        $type = $reviewType === 'store' ? 'del negozio' : 'del prodotto';
        $this->send($seller, new MarketplaceTransactionalMail(
            "Nuova recensione {$type} ricevuta", "È stata inviata una nuova recensione {$type}",
            'Un acquirente ha lasciato un riscontro sul tuo negozio. Consultalo nel Seller Hub quando preferisci.',
            $details, ctaLabel: 'Apri il Seller Hub', ctaUrl: $this->sellerUrl('/profile?tab=reviews'), recipientName: $seller->name,
        ));
    }

    public function sellerWalletTransaction(User $seller, SellerWalletEntry $entry, SellerWallet $wallet): void
    {
        $balances = (array) $entry->balances_after;
        $this->send($seller, new MarketplaceTransactionalMail(
            'Transazione sul wallet venditore', 'Il tuo wallet venditore è cambiato',
            $entry->description ?: 'È stata registrata una transazione sul tuo wallet venditore.',
            [
                'Tipo di transazione' => $this->label($entry->type), 'Importo' => $this->money($entry->amount),
                'Direzione' => ((float) $entry->amount >= 0 ? 'Accredito' : 'Addebito'), 'Riferimento' => $entry->reference,
                'Saldo disponibile' => $this->money($balances['available_balance'] ?? $wallet->available_balance),
                'Stato' => 'Completata', 'Data e ora' => $entry->created_at?->timezone(config('app.timezone'))?->locale('it')->translatedFormat('j M Y, H:i'),
            ], ctaLabel: 'Visualizza il wallet', ctaUrl: $this->sellerUrl('/wallet'), recipientName: $seller->name,
        ));
    }

    public function buyerWalletTransaction(User $buyer, Transaction $transaction): void
    {
        $meta = (array) $transaction->meta;
        $this->send($buyer, new MarketplaceTransactionalMail(
            'Transazione sul wallet acquirente', 'Il tuo wallet è cambiato',
            $transaction->description ?: 'È stata registrata una transazione sul tuo wallet acquirente.',
            [
                'Tipo di transazione' => $this->label($transaction->type), 'Importo' => $this->money($transaction->amount),
                'Direzione' => ((float) $transaction->amount >= 0 ? 'Accredito' : 'Addebito'), 'Riferimento' => $transaction->payment_reference,
                'Saldo precedente' => isset($meta['balance_before']) ? $this->money($meta['balance_before']) : null,
                'Saldo aggiornato' => isset($meta['balance_after']) ? $this->money($meta['balance_after']) : null,
                'Stato' => $this->label($transaction->status), 'Data e ora' => $transaction->created_at?->timezone(config('app.timezone'))?->locale('it')->translatedFormat('j M Y, H:i'),
            ], ctaLabel: 'Visualizza il wallet', ctaUrl: $this->buyerUrl('/profile?tab=wallet'), recipientName: $buyer->name,
        ));
    }

    private function send(?User $recipient, MarketplaceTransactionalMail $mail): bool
    {
        if (! $recipient?->email || ! filter_var($recipient->email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $deliver = function () use ($recipient, $mail): bool {
            try {
                // Emails are rendered in Italian only. Scoping this to the
                // delivery closure keeps API validation messages in the
                // locale the frontends expect.
                App::setLocale(config('marketplace.mail_locale', 'it'));
                Mail::to($recipient->email, $recipient->name)->send($mail);

                return true;
            } catch (\Throwable $exception) {
                Log::error('Marketplace email delivery failed.', ['event' => $mail->subjectLine, 'user_id' => $recipient->id, 'exception' => $exception->getMessage()]);

                return false;
            }
        };
        if (DB::transactionLevel() > 0) {
            DB::afterCommit($deliver);

            return true;
        }

        return $deliver();
    }

    /** @param iterable<\App\Models\OrderItem> $items @return array<int, array<string, string|int|float|null>> */
    private function items(iterable $items): array
    {
        $rows = [];
        foreach ($items as $item) {
            $rows[] = [
                'name' => $item->product_name ?: 'Prodotto', 'sku' => $item->product_sku,
                'quantity' => $item->quantity, 'price' => $this->money($item->price), 'total' => $this->money($item->line_total),
            ];
        }

        return $rows;
    }

    /** @return array<string, string> */
    private function orderDetails(Order $order): array
    {
        return ['Numero ordine' => $order->order_no, 'Subtotale articoli' => $this->money($order->items_total),
            'Sconti' => $this->money($order->discount_total), 'Totale' => $this->money($order->grand_total),
            'Stato del pagamento' => $this->label($order->payment_status)];
    }

    /** @return array<string, string> */
    private function storeOrderDetails(StoreOrder $order): array
    {
        return ['Numero ordine' => $order->order?->order_no, 'Negozio' => $order->store?->name,
            'Subtotale articoli' => $this->money($order->subtotal), 'Sconto coupon' => $this->money($order->coupon_discount),
            'Costo di spedizione' => $this->money($order->delivery_fee), 'Totale' => $this->money($order->total),
            'Stato dell\'ordine' => $this->label($order->status)];
    }

    private function address(StoreOrder $order): ?string
    {
        $address = (array) ($order->delivery_address_snapshot ?: $order->order?->delivery_address_snapshot ?: []);

        return $address ? implode(', ', array_filter([$address['full_name'] ?? null, $address['address_line_1'] ?? null, $address['address_line_2'] ?? null, $address['city_name'] ?? null, $address['postal_code'] ?? null, $address['country_name'] ?? null])) : null;
    }

    private function money(mixed $amount): string
    {
        return '€'.number_format((float) ($amount ?? 0), 2, ',', '.');
    }

    /**
     * Render a stored enum value as an Italian label. Unknown values fall back
     * to the raw value so a new status is still readable rather than blank.
     */
    private function label(?string $value): string
    {
        $key = (string) $value;
        if ($key === '') {
            return '';
        }

        return self::STATUS_LABELS[$key]
            ?? ucwords(str_replace(['_', '-'], ' ', $key));
    }

    private function buyerUrl(string $path): string
    {
        return $this->url((string) (env('BUYER_FRONTEND_URL') ?: config('app.url') ?: 'http://localhost:3000'), $path);
    }

    private function sellerUrl(string $path): string
    {
        return $this->url((string) (env('SELLER_FRONTEND_URL') ?: config('app.url') ?: 'http://localhost:3001'), $path);
    }

    private function url(string $base, string $path): string
    {
        return rtrim($base, '/').'/'.ltrim($path, '/');
    }
}
