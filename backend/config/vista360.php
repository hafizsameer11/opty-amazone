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

    // Payments are intentionally not collected during the current rollout.
    // Every seller can activate an enabled plan directly; it remains fully
    // auditable and keeps the same term/expiry/feature enforcement.
    'self_service_enabled' => env('VISTA360_SELF_SERVICE_ENABLED', true),

    // The optional signed event lets the CRM invalidate its short-lived local
    // entitlement cache immediately when an admin changes a subscription.
    'crm_webhook_url' => env('VISTA360_CRM_WEBHOOK_URL'),
    'crm_webhook_secret' => env('VISTA360_CRM_WEBHOOK_SECRET'),
];
