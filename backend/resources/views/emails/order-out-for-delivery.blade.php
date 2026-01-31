<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Shipped</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0066CC;">Order Shipped</h2>
        
        <p>Hello {{ $storeOrder->order->user->name }},</p>
        
        <p>Your order from <strong>{{ $storeOrder->store->name }}</strong> is now out for delivery!</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Store:</strong> {{ $storeOrder->store->name }}</p>
            @if($storeOrder->delivery_method)
            <p><strong>Delivery Method:</strong> {{ $storeOrder->delivery_method }}</p>
            @endif
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Delivery Code (OTP):</strong> <span style="font-size: 24px; font-weight: bold; color: #0066CC;">{{ $storeOrder->delivery_code }}</span></p>
            <p style="font-size: 12px; color: #666;">Please have this code ready. The seller will need it to mark your order as delivered.</p>
        </div>

        <p>Your order should arrive soon!</p>
        
        <p>Thank you!</p>
    </div>
</body>
</html>

