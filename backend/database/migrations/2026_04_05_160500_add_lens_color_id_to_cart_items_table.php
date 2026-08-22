<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Matches BuyerCartController duplicate-line detection and create payload.
     */
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            if (!Schema::hasColumn('cart_items', 'lens_color_id')) {
                $table->unsignedBigInteger('lens_color_id')
                    ->nullable()
                    ->after('lens_thickness_option_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            if (Schema::hasColumn('cart_items', 'lens_color_id')) {
                $table->dropColumn('lens_color_id');
            }
        });
    }
};
