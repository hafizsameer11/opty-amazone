<?php

return [
    /*
     * Vista Express 360 is deliberately separate from the older marketplace
     * subscription feature.  These values only control CRM access granted to
     * a Vista seller through the OAuth connection.
     */
    'enabled' => env('VISTA360_ENABLED', true),
    'seller_url' => rtrim((string) env('VISTA360_SELLER_URL', env('SELLER_APP_URL', 'https://seller.vistaexpress.it')), '/'),
    'crm_url' => rtrim((string) env('VISTA360_CRM_URL', 'https://vistaexpressbusiness.com'), '/'),

    // A Stripe one-time Checkout session is used for the selected term. It
    // does not create an unapproved recurring charge. Renewals are purchases
    // of another configured 1, 6 or 12 month term.
    'stripe_webhook_secret' => env('VISTA360_STRIPE_WEBHOOK_SECRET'),
    'checkout_return_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', env('VISTA360_CHECKOUT_RETURN_ORIGINS', 'https://seller.vistaexpress.it,http://localhost:3121,http://127.0.0.1:3121'))
    ))),

    // The optional signed event lets the CRM invalidate its short-lived local
    // entitlement cache immediately when an admin changes a subscription.
    'crm_webhook_url' => env('VISTA360_CRM_WEBHOOK_URL'),
    'crm_webhook_secret' => env('VISTA360_CRM_WEBHOOK_SECRET'),
];
