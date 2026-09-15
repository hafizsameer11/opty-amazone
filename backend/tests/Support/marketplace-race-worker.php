<?php

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (config('database.connections.mysql.database') !== 'opty_marketplace_test' || ! app()->environment('testing')) {
    throw new RuntimeException('Disposable test database required.');
}
$data = json_decode($argv[1], true, 512, JSON_THROW_ON_ERROR);
while (microtime(true) < $data['start']) {
    usleep(10000);
}
try {
    $user = App\Models\User::findOrFail($data['user']);
    $so = isset($data['order']) ? App\Models\StoreOrder::findOrFail($data['order']) : null;
    $result = match ($data['action']) {
        'topup' => app(App\Services\Marketplace\BuyerWalletService::class)->developmentTopUp($user, '20.00', 'race-topup'),
        'quote' => app(App\Services\Marketplace\OrderTotalsService::class)->quote($so, $user, ['delivery_fee' => '7.50', 'delivery_method' => 'Courier', 'estimated_delivery_date' => now()->addDay()->toDateString(), 'delivery_notes' => 'Race test', 'idempotency_key' => 'race-quote']),
        'pay' => app(App\Services\Marketplace\PaymentService::class)->pay($so, $user, ['payment_method' => 'wallet', 'expected_total' => '87.50', 'idempotency_key' => 'race-payment']),
        'verify' => app(App\Services\Marketplace\DeliveryVerificationService::class)->verify($so, $user, $data['code']),
        'withdraw' => app(App\Services\Marketplace\WithdrawalService::class)->request($user, ['amount' => '50.00', 'idempotency_key' => 'race-withdraw', 'bank_details' => ['account_name' => 'Seller', 'account_number' => 'DE123', 'bank_name' => 'Bank']]),
        'refund' => app(App\Services\Marketplace\RefundService::class)->cancel($so, $user, 'Concurrent admin refund'),
    };
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    exit(1);
}
