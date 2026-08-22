<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('name_it')->nullable()->after('name');
        });

        Schema::table('store_banners', function (Blueprint $table) {
            $table->boolean('is_approved')->default(true)->after('is_active');
            $table->text('rejection_reason')->nullable()->after('is_approved');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('name_it');
        });

        Schema::table('store_banners', function (Blueprint $table) {
            $table->dropColumn(['is_approved', 'rejection_reason']);
        });
    }
};
