<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Placed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0066CC;">Order Placed Successfully</h2>
        
        <p>Hello {{ $order->user->name }},</p>
        
        <p>Your order has been placed successfully!</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> {{ $order->order_no }}</p>
            <p><strong>Order Date:</strong> {{ $order->created_at->format('F d, Y h:i A') }}</p>
            <p><strong>Total Amount:</strong> ${{ number_format($order->grand_total, 2) }}</p>
        </div>

        @if($storeOrder)
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Store:</strong> {{ $storeOrder->store->name }}</p>
            <p><strong>Delivery Code (OTP):</strong> <span style="font-size: 24px; font-weight: bold; color: #0066CC;">{{ $storeOrder->delivery_code }}</span></p>
            <p style="font-size: 12px; color: #666;">Please save this code. The seller will need it to mark your order as delivered.</p>
        </div>
        @endif

        <p>You will receive another email once the seller accepts your order.</p>
        
        <p>Thank you for your purchase!</p>
    </div>
</body>
</html>

