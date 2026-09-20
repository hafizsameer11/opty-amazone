<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Remove the unused percentage-cap setting from existing installations. */
    public function up(): void
    {
        if (Schema::hasColumn('coupons', 'max_discount')) {
            Schema::table('coupons', fn (Blueprint $table) => $table->dropColumn('max_discount'));
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('coupons', 'max_discount')) {
            Schema::table('coupons', fn (Blueprint $table) => $table->decimal('max_discount', 10, 2)->nullable()->after('discount_value'));
        }
    }
};
