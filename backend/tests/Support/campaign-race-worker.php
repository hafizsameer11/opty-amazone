<?php
require __DIR__.'/../../vendor/autoload.php';
$xml=simplexml_load_file(__DIR__.'/../../phpunit.campaigns.xml');
foreach ($xml->php->env as $v) { $key=(string) $v['name']; $value=(string) $v['value']; putenv($key.'='.$value); $_ENV[$key]=$value; $_SERVER[$key]=$value; }
$app=require __DIR__.'/../../bootstrap/app.php'; $app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();
if (config('database.connections.mysql.database')!=='opty_commerce_campaign_test' || (int) config('database.connections.mysql.port')!==3318) { throw new RuntimeException('Disposable DB required'); }
[$script,$user,$address,$barrier]=$argv;
$deadline=microtime(true)+15;
while (!is_file($barrier) && microtime(true)<$deadline) { usleep(10000); }
try {
    $result=app(\App\Services\Order\OrderService::class)->placeOrder(\App\Models\User::findOrFail($user),(int) $address);
    echo json_encode(['order'=>$result['order']->id,'total'=>$result['order']->grand_total]);
} catch (Throwable $e) { fwrite(STDERR,$e->getMessage()); exit(1); }
