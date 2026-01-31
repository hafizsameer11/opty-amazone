<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Received</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00CC66;">Payment Received</h2>
        
        <p>Hello {{ $storeOrder->store->user->name }},</p>
        
        <p>Payment has been received for an order from your store!</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Customer:</strong> {{ $storeOrder->order->user->name }}</p>
            <p><strong>Amount Received:</strong> ${{ number_format($storeOrder->total, 2) }}</p>
            <p><strong>Payment Status:</strong> Funds are now in escrow</p>
        </div>

        <p>Please prepare the order and mark it as out for delivery when ready.</p>
        
        <p>Thank you!</p>
    </div>
</body>
</html>

