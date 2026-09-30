<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordine effettuato</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0066CC;">Ordine effettuato con successo</h2>

        <p>Ciao {{ $order->user->name }},</p>

        <p>Il tuo ordine è stato effettuato con successo!</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Numero ordine:</strong> {{ $order->order_no }}</p>
            <p><strong>Data dell'ordine:</strong> {{ $order->created_at->locale('it')->translatedFormat('j F Y, H:i') }}</p>
            <p><strong>Importo totale:</strong> €{{ number_format($order->grand_total, 2, ',', '.') }}</p>
        </div>

        @if($storeOrder)
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Negozio:</strong> {{ $storeOrder->store->name }}</p>
            <p>Dopo il pagamento troverai il tuo codice di consegna nella pagina dell'ordine. Condividilo solo dopo aver ricevuto l'ordine.</p>
            <p style="font-size: 12px; color: #666;">Conserva questo codice. Il venditore dovrà utilizzarlo per contrassegnare l'ordine come consegnato.</p>
        </div>
        @endif

        <p>Riceverai un'altra email quando il venditore accetterà il tuo ordine.</p>

        <p>Grazie per il tuo acquisto!</p>
    </div>
</body>
</html>
