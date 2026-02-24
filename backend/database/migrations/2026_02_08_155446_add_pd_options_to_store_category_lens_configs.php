<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('store_category_field_configs', function (Blueprint $table) {
            if (!Schema::hasColumn('store_category_field_configs', 'pd_options')) {
                $table->json('pd_options')->nullable()->after('field_config')->comment('PD (Pupillary Distance) options as JSON array, e.g., ["50.00", "50.50", "51.00", ...] or null for default (50.0-75.0 in 0.5 increments)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_category_field_configs', function (Blueprint $table) {
            if (Schema::hasColumn('store_category_field_configs', 'pd_options')) {
                $table->dropColumn('pd_options');
            }
        });
    }
};
