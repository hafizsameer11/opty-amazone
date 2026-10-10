<?php

return [
    // Disabled until the two local/staging installations agree on these values.
    'enabled' => env('OPTICAL_INTEGRATION_ENABLED', false),
    'client_id' => env('OPTICAL_CLIENT_ID', 'optical-shop'),
    'client_secret' => env('OPTICAL_CLIENT_SECRET'),
    'redirect_uri' => env('OPTICAL_REDIRECT_URI'),
    // Explicit opt-in for a local Optical client of a live Vista server.
    // The single exact callback and PKCE remain required.
    'allow_loopback_redirect' => env('OPTICAL_ALLOW_LOOPBACK_REDIRECT', false),
    'currency' => 'EUR', // Existing Vista Express marketplace uses EUR amounts.
    'require_verified_email' => env('OPTICAL_REQUIRE_VERIFIED_EMAIL', true),
    'grant_days' => 30,
];
