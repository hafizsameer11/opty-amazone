<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'lens_color_id')) {
                $table->unsignedBigInteger('lens_color_id')->nullable()->after('lens_thickness_option_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'lens_color_id')) {
                $table->dropColumn('lens_color_id');
            }
        });
    }
};
