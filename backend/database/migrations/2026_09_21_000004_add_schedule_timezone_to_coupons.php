<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('coupons', 'schedule_timezone')) {
            Schema::table('coupons', function (Blueprint $table) {
                $table->string('schedule_timezone', 64)->nullable()->after('starts_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('coupons', 'schedule_timezone')) {
            Schema::table('coupons', function (Blueprint $table) {
                $table->dropColumn('schedule_timezone');
            });
        }
    }
};
