<?php

return [
    'development_top_up' => env('MARKETPLACE_DEVELOPMENT_TOP_UP', false),
    // Temporary direct funding switch. Set this to false once a payment gateway
    // takes responsibility for creating seller wallet credits.
    'seller_wallet_top_up_enabled' => env('MARKETPLACE_SELLER_WALLET_TOP_UP_ENABLED', true),
    'top_up_max_cents' => 10000000,
    'delivery_code_days' => 7,
    'delivery_code_attempts' => 5,
    'delivery_code_lock_minutes' => 15,
    'development_return_origins' => array_filter(array_map('trim', explode(',', env('MARKETPLACE_DEVELOPMENT_RETURN_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002')))),
];
