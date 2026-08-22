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
        Schema::table('store_banners', function (Blueprint $table) {
            $table->boolean('is_home_boosted')->default(false)->after('is_active');
            $table->index(['is_active', 'is_home_boosted']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_banners', function (Blueprint $table) {
            $table->dropIndex(['is_active', 'is_home_boosted']);
            $table->dropColumn('is_home_boosted');
        });
    }
};

