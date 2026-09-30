<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordine accettato</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00CC66;">Ordine accettato</h2>

        <p>Ciao {{ $storeOrder->order->user->name }},</p>

        <p>Buone notizie! Il tuo ordine è stato accettato da <strong>{{ $storeOrder->store->name }}</strong>.</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Numero ordine:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Negozio:</strong> {{ $storeOrder->store->name }}</p>
            <p><strong>Subtotale:</strong> €{{ number_format($storeOrder->subtotal, 2, ',', '.') }}</p>
            <p><strong>Costo di consegna:</strong> €{{ number_format($storeOrder->delivery_fee, 2, ',', '.') }}</p>
            <p><strong>Importo totale:</strong> €{{ number_format($storeOrder->total, 2, ',', '.') }}</p>
            @if($storeOrder->estimated_delivery_date)
            <p><strong>Consegna prevista:</strong> {{ $storeOrder->estimated_delivery_date->locale('it')->translatedFormat('j F Y') }}</p>
            @endif
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p>Dopo il pagamento troverai il tuo codice di consegna nella pagina dell'ordine. Condividilo solo dopo aver ricevuto l'ordine.</p>
            <p style="font-size: 12px; color: #666;">Conserva questo codice. Il venditore dovrà utilizzarlo per contrassegnare l'ordine come consegnato.</p>
        </div>

        <p>Procedi con il pagamento per completare il tuo ordine.</p>

        <p>Grazie!</p>
    </div>
</body>
</html>
