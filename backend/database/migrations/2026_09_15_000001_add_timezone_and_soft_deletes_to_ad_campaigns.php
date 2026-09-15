<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ad_campaigns', function (Blueprint $table) {
            // Existing Boost rows are already stored as UTC instants. We cannot safely
            // infer their original wall-clock zone, so UTC is the lossless default.
            if (! Schema::hasColumn('ad_campaigns', 'schedule_timezone')) {
                $table->string('schedule_timezone', 64)->default('UTC')->after('ends_at');
            }
            if (! Schema::hasColumn('ad_campaigns', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('ad_campaigns', function (Blueprint $table) {
            if (Schema::hasColumn('ad_campaigns', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
            if (Schema::hasColumn('ad_campaigns', 'schedule_timezone')) {
                $table->dropColumn('schedule_timezone');
            }
        });
    }
};
