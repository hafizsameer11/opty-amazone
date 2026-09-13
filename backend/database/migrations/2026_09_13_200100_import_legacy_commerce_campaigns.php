<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void { app(\App\Services\Campaigns\LegacyCampaignImportService::class)->import(); }
    public function down(): void { /* Preserve historical snapshots and legacy data. */ }
};
