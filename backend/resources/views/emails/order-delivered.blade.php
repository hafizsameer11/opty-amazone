<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Delivered</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00CC66;">Order Delivered</h2>
        
        <p>Hello {{ $storeOrder->order->user->name }},</p>
        
        <p>Your order from <strong>{{ $storeOrder->store->name }}</strong> has been delivered!</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Store:</strong> {{ $storeOrder->store->name }}</p>
            <p><strong>Delivered On:</strong> {{ $storeOrder->delivered_at->format('F d, Y h:i A') }}</p>
        </div>

        <p>Payment has been released to the seller. We hope you're satisfied with your purchase!</p>
        
        <p>Thank you for shopping with us!</p>
    </div>
</body>
</html>

