<?php

return [

    /*
    |--------------------------------------------------------------------------
    | CRM read-only integration
    |--------------------------------------------------------------------------
    |
    | This namespace exists so the external LEO24 CRM can read platform
    | business data without holding an administrator session or token. It is
    | intentionally read-only: no route in routes/crm.php mutates state, and
    | the API key cannot be used against /api/admin/*, /api/seller/* or
    | /api/buyer/* because authentication here is independent of the `sanctum`
    | guard used by those surfaces.
    |
    */

    'enabled' => env('CRM_ENABLED', true),

    /*
    | Request header carrying the plaintext API key. The key is never stored:
    | only its SHA-256 hash is persisted, so a database leak cannot be
    | replayed against this API.
    */
    'key_header' => env('CRM_KEY_HEADER', 'X-CRM-API-Key'),

    /*
    | Fallback rate limit applied when an individual client does not define
    | its own. Counted per client key, not per IP.
    */
    'default_rate_limit' => (int) env('CRM_RATE_LIMIT', 120),

    /*
    | Pagination guards. The admin list endpoints leave per_page uncapped in
    | places; every CRM list endpoint is clamped so a single request can never
    | ask the database for an unbounded result set.
    */
    'default_page_size' => 25,
    'max_page_size' => 100,

    /*
    | Reporting window bounds for the overview/trend endpoints.
    */
    'default_range_months' => 12,
    'max_range_months' => 24,

    /*
    | How many rows the best-selling / recent-activity blocks return.
    */
    'best_selling_limit' => 10,
    'recent_activity_limit' => 20,

];
