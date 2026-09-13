<?php

return [
    'currency' => 'EUR',
    'review_required' => env('ADS_REVIEW_REQUIRED', true),
    'placements' => ['homepage', 'categories', 'search', 'recommendations'],
    'attribution_days' => 7,
    'token_minutes' => 30,
    'max_days' => 90,
    'max_budget_cents' => 10000000,
];
