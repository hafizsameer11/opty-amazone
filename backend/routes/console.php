<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

\Illuminate\Support\Facades\Schedule::job(new \App\Jobs\RefreshAdCampaigns)->everyMinute()->withoutOverlapping();
\Illuminate\Support\Facades\Schedule::job(new \App\Jobs\AggregateAdAnalytics)->everyFiveMinutes()->withoutOverlapping();
\Illuminate\Support\Facades\Schedule::job(new \App\Jobs\ReconcileAdSpending)->hourly()->withoutOverlapping();

Artisan::command('ads:import-legacy {--apply : Import snapshots; default is read-only}', function () {
    $query = \App\Models\Product::withTrashed()->where(fn ($q) => $q->where('is_boosted', true)
        ->orWhereNotNull('boost_payment_status')->orWhereNotNull('boost_budget'));
    $this->info('Legacy records: '.$query->count().'. Product fields and wallet balances are preserved.');
    if (!$this->option('apply')) { return; }
    $query->chunkById(100, function ($products) {
        foreach ($products as $product) { app(\App\Services\Ads\LegacyBoostImportService::class)->import($product->id); }
    });
    $this->info('Imported into legacy_review. Payment flags do not constitute proof of payment.');
});
