<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc3545;">Order Rejected</h2>
        
        <p>Hello {{ $storeOrder->order->user->name }},</p>
        
        <p>We're sorry to inform you that your order from <strong>{{ $storeOrder->store->name }}</strong> has been rejected.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order Number:</strong> {{ $storeOrder->order->order_no }}</p>
            <p><strong>Store:</strong> {{ $storeOrder->store->name }}</p>
            @if($storeOrder->rejection_reason)
            <p><strong>Reason:</strong> {{ $storeOrder->rejection_reason }}</p>
            @endif
        </div>

        <p>If you have any questions, please contact the store or our support team.</p>
        
        <p>Thank you for your understanding.</p>
    </div>
</body>
</html>

