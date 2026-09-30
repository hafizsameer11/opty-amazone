<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ordine rifiutato</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545;">Ordine rifiutato</h2>

        <p>Ciao {{ $storeOrder->order->user->name }},</p>

        <p>Ti informiamo con rammarico che il tuo ordine presso <strong>{{ $storeOrder->store->name }}</strong> è stato rifiutato.</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Numero ordine:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Negozio:</strong> {{ $storeOrder->store->name }}</p>
            @if($storeOrder->rejection_reason)
            <p><strong>Motivo:</strong> {{ $storeOrder->rejection_reason }}</p>
            @endif
        </div>

        <p>Se hai domande, contatta il negozio o il nostro servizio di assistenza.</p>

        <p>Grazie per la comprensione.</p>
    </div>
</body>
</html>
