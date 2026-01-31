<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Accepted</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #00CC66;">Order Accepted</h2>
        
        <p>Hello {{ $storeOrder->order->user->name }},</p>
        
        <p>Great news! Your order has been accepted by <strong>{{ $storeOrder->store->name }}</strong>.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Store:</strong> {{ $storeOrder->store->name }}</p>
            <p><strong>Subtotal:</strong> ${{ number_format($storeOrder->subtotal, 2) }}</p>
            <p><strong>Delivery Fee:</strong> ${{ number_format($storeOrder->delivery_fee, 2) }}</p>
            <p><strong>Total Amount:</strong> ${{ number_format($storeOrder->total, 2) }}</p>
            @if($storeOrder->estimated_delivery_date)
            <p><strong>Estimated Delivery:</strong> {{ $storeOrder->estimated_delivery_date->format('F d, Y') }}</p>
            @endif
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Delivery Code (OTP):</strong> <span style="font-size: 24px; font-weight: bold; color: #0066CC;">{{ $storeOrder->delivery_code }}</span></p>
            <p style="font-size: 12px; color: #666;">Please save this code. The seller will need it to mark your order as delivered.</p>
        </div>

        <p>Please proceed to payment to complete your order.</p>
        
        <p>Thank you!</p>
    </div>
</body>
</html>

