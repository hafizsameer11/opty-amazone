<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_boosted')) {
                $table->boolean('is_boosted')->default(false)->after('is_featured');
            }
            if (!Schema::hasColumn('products', 'boosted_at')) {
                $table->timestamp('boosted_at')->nullable()->after('is_boosted');
            }
            if (!Schema::hasColumn('products', 'boost_location')) {
                $table->string('boost_location', 100)->nullable()->after('boosted_at');
            }
            if (!Schema::hasColumn('products', 'boost_budget')) {
                $table->decimal('boost_budget', 10, 2)->nullable()->after('boost_location');
            }
            if (!Schema::hasColumn('products', 'boost_start_at')) {
                $table->timestamp('boost_start_at')->nullable()->after('boost_budget');
            }
            if (!Schema::hasColumn('products', 'boost_end_at')) {
                $table->timestamp('boost_end_at')->nullable()->after('boost_start_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            foreach (['boost_end_at', 'boost_start_at', 'boost_budget', 'boost_location', 'boosted_at', 'is_boosted'] as $col) {
                if (Schema::hasColumn('products', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

