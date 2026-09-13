<?php

// Independent database connection for the concurrency regression test only.
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (! app()->environment('testing') || config('database.connections.mysql.host') !== '127.0.0.1'
    || ! str_starts_with(config('database.connections.mysql.database'), 'opty_ads_test')) {
    throw new RuntimeException('Concurrency workers require an isolated local test database.');
}
$payload = json_decode(base64_decode($argv[1]), true, flags: JSON_THROW_ON_ERROR);
try {
    if ($payload['action'] === 'click') {
        $request = \Illuminate\Http\Request::create('/api/buyer/ads/events', 'POST', server: ['REMOTE_ADDR' => $payload['ip'], 'HTTP_USER_AGENT' => 'AdConcurrency']);
        $request->setUserResolver(fn () => null);
        $result = app(\App\Services\Ads\AdTrackingService::class)->track($request, $payload['token'], 'click');
    } else {
        $result = app(\App\Services\Ads\AdCampaignService::class)->action(
            \App\Models\AdCampaign::findOrFail($payload['campaign']), \App\Models\User::findOrFail($payload['actor']), $payload['action']);
    }
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    fwrite(STDERR, get_class($e).': '.$e->getMessage());
    exit(1);
}
