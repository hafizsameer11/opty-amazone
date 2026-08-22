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
        Schema::table('frame_sizes', function (Blueprint $table) {
            if (!Schema::hasColumn('frame_sizes', 'price')) {
                $table->decimal('price', 10, 2)->nullable()->after('size_label');
            }
            if (!Schema::hasColumn('frame_sizes', 'image')) {
                $table->string('image', 2048)->nullable()->after('price');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('frame_sizes', function (Blueprint $table) {
            if (Schema::hasColumn('frame_sizes', 'image')) {
                $table->dropColumn('image');
            }
            if (Schema::hasColumn('frame_sizes', 'price')) {
                $table->dropColumn('price');
            }
        });
    }
};
