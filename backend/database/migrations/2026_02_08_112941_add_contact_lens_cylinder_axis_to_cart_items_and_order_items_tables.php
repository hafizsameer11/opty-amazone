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
        // Add cylinder and axis fields to cart_items table
        Schema::table('cart_items', function (Blueprint $table) {
            // Contact lens cylinder and axis fields (left eye)
            if (!Schema::hasColumn('cart_items', 'contact_lens_left_cylinder')) {
                $table->decimal('contact_lens_left_cylinder', 5, 2)->nullable()->after('contact_lens_left_qty');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_left_axis')) {
                $table->integer('contact_lens_left_axis')->nullable()->after('contact_lens_left_cylinder');
            }

            // Contact lens cylinder and axis fields (right eye)
            if (!Schema::hasColumn('cart_items', 'contact_lens_right_cylinder')) {
                $table->decimal('contact_lens_right_cylinder', 5, 2)->nullable()->after('contact_lens_right_qty');
            }
            if (!Schema::hasColumn('cart_items', 'contact_lens_right_axis')) {
                $table->integer('contact_lens_right_axis')->nullable()->after('contact_lens_right_cylinder');
            }
        });

        // Add cylinder and axis fields to order_items table
        Schema::table('order_items', function (Blueprint $table) {
            // Contact lens cylinder and axis fields (left eye) - snapshots
            if (!Schema::hasColumn('order_items', 'contact_lens_left_cylinder')) {
                $table->decimal('contact_lens_left_cylinder', 5, 2)->nullable()->after('contact_lens_left_qty');
            }
            if (!Schema::hasColumn('order_items', 'contact_lens_left_axis')) {
                $table->integer('contact_lens_left_axis')->nullable()->after('contact_lens_left_cylinder');
            }

            // Contact lens cylinder and axis fields (right eye) - snapshots
            if (!Schema::hasColumn('order_items', 'contact_lens_right_cylinder')) {
                $table->decimal('contact_lens_right_cylinder', 5, 2)->nullable()->after('contact_lens_right_qty');
            }
            if (!Schema::hasColumn('order_items', 'contact_lens_right_axis')) {
                $table->integer('contact_lens_right_axis')->nullable()->after('contact_lens_right_cylinder');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn([
                'contact_lens_left_cylinder',
                'contact_lens_left_axis',
                'contact_lens_right_cylinder',
                'contact_lens_right_axis',
            ]);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn([
                'contact_lens_left_cylinder',
                'contact_lens_left_axis',
                'contact_lens_right_cylinder',
                'contact_lens_right_axis',
            ]);
        });
    }
};
