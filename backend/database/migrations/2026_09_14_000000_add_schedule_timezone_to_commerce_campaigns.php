<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['discount_campaigns', 'banner_campaigns'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                // Existing campaign dates are already UTC, so UTC is the only safe
                // default for historical rows whose original wall-clock zone is unknown.
                $table->string('schedule_timezone', 64)->default('UTC')->after('ends_at');
            });
        }
    }

    public function down(): void
    {
        // Preserve the stored scheduling context with campaign history.
    }
};
