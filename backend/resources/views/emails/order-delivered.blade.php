<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordine consegnato</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00CC66;">Ordine consegnato</h2>

        <p>Ciao {{ $storeOrder->order->user->name }},</p>

        <p>Il tuo ordine presso <strong>{{ $storeOrder->store->name }}</strong> è stato consegnato!</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Numero ordine:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Negozio:</strong> {{ $storeOrder->store->name }}</p>
            <p><strong>Consegnato il:</strong> {{ $storeOrder->delivered_at->locale('it')->translatedFormat('j F Y, H:i') }}</p>
        </div>

        <p>Il pagamento è stato rilasciato al venditore. Speriamo che tu sia soddisfatto del tuo acquisto!</p>

        <p>Grazie per aver scelto di acquistare da noi!</p>
    </div>
</body>
</html>
