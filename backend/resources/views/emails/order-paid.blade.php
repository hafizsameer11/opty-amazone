<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagamento ricevuto</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00CC66;">Pagamento ricevuto</h2>

        <p>Ciao {{ $storeOrder->store->user->name }},</p>

        <p>È stato ricevuto il pagamento di un ordine effettuato presso il tuo negozio!</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Numero ordine:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Cliente:</strong> {{ $storeOrder->order->user->name }}</p>
            <p><strong>Importo ricevuto:</strong> €{{ number_format($storeOrder->total, 2, ',', '.') }}</p>
            <p><strong>Stato del pagamento:</strong> I fondi sono ora in garanzia (escrow)</p>
        </div>

        <p>Prepara l'ordine e impostalo come in consegna quando sarà pronto.</p>

        <p>Grazie!</p>
    </div>
</body>
</html>
