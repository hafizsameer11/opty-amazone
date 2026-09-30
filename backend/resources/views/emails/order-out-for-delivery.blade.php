<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordine spedito</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0066CC;">Ordine spedito</h2>

        <p>Ciao {{ $storeOrder->order->user->name }},</p>

        <p>Il tuo ordine presso <strong>{{ $storeOrder->store->name }}</strong> è ora in consegna!</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Numero ordine:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Negozio:</strong> {{ $storeOrder->store->name }}</p>
            @if($storeOrder->delivery_method)
            <p><strong>Metodo di consegna:</strong> {{ $storeOrder->delivery_method }}</p>
            @endif
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p>Dopo il pagamento troverai il tuo codice di consegna nella pagina dell'ordine. Condividilo solo dopo aver ricevuto l'ordine.</p>
            <p style="font-size: 12px; color: #666;">Tieni questo codice a portata di mano. Il venditore dovrà utilizzarlo per contrassegnare l'ordine come consegnato.</p>
        </div>

        <p>Il tuo ordine dovrebbe arrivare a breve!</p>

        <p>Grazie!</p>
    </div>
</body>
</html>
