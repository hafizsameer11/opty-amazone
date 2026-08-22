<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->unsignedInteger('contact_lens_pack_quantity')->nullable()->after('contact_lens_right_axis');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedInteger('contact_lens_pack_quantity')->nullable()->after('contact_lens_right_axis');
        });
    }

    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn('contact_lens_pack_quantity');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('contact_lens_pack_quantity');
        });
    }
};
