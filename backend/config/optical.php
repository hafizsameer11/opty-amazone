<?php

return [
    // Disabled until the two local/staging installations agree on these values.
    'enabled' => env('OPTICAL_INTEGRATION_ENABLED', false),
    'client_id' => env('OPTICAL_CLIENT_ID', 'optical-shop'),
    'client_secret' => env('OPTICAL_CLIENT_SECRET'),
    'redirect_uri' => env('OPTICAL_REDIRECT_URI'),
    'currency' => 'EUR', // Existing Vista Express marketplace uses EUR amounts.
    'require_verified_email' => env('OPTICAL_REQUIRE_VERIFIED_EMAIL', true),
    'grant_days' => 30,
];
