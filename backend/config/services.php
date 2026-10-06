<?php

return [
    'stripe' => [
        'secret' => env('STRIPE_SECRET_KEY'),
        'return_origins' => explode(',', env('STRIPE_RETURN_ORIGINS', 'http://localhost:3120,http://localhost:3121,http://127.0.0.1:3120,http://127.0.0.1:3121,https://vistaexpress.it,https://seller.vistaexpress.it')),
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Seller product image processing
    |--------------------------------------------------------------------------
    |
    | Product and variant images are sent only to the private, self-hosted
    | processor before they are stored. It uses rembg/BiRefNet and returns a
    | white-background catalogue WebP. Uploads keep working with the original
    | image if this optional service is disabled or temporarily unavailable.
    |
    */
    'product_image_processor' => [
        'enabled' => env('PRODUCT_IMAGE_PROCESSOR_ENABLED', false),
        'url' => rtrim((string) env('PRODUCT_IMAGE_PROCESSOR_URL', 'http://127.0.0.1:8030'), '/'),
        'token' => env('PRODUCT_IMAGE_PROCESSOR_TOKEN'),
        'timeout' => (int) env('PRODUCT_IMAGE_PROCESSOR_TIMEOUT', 90),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
