<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

\Illuminate\Support\Facades\Schedule::call(fn () => app(\App\Jobs\RefreshCommerceCampaigns::class)->handle())->name('refresh-commerce-campaigns')->everyMinute()->withoutOverlapping();
\Illuminate\Support\Facades\Schedule::call(fn () => app(\App\Jobs\AggregateCommerceCampaigns::class)->handle())->name('aggregate-commerce-campaigns')->everyFiveMinutes()->withoutOverlapping();
Artisan::command('campaigns:import-legacy {--apply}', function () {
    if (!$this->option('apply')) { $this->info('Read-only: run with --apply to import preserved legacy snapshots. Product prices and legacy records are never modified.'); return; }
    $this->info(json_encode(app(\App\Services\Campaigns\LegacyCampaignImportService::class)->import()));
});

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run lifecycle transitions in the scheduler process, like Discount Campaigns and
// Banners. This avoids a scheduled Boost waiting behind an unrelated queue backlog.
\Illuminate\Support\Facades\Schedule::call(fn () => app(\App\Jobs\RefreshAdCampaigns::class)->handle())
    ->name('refresh-ad-campaigns')->everyMinute()->withoutOverlapping();
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
