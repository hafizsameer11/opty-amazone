<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Some SQL imports supplied this column, but fresh migration installs did not.
        if (! Schema::hasColumn('frame_sizes', 'product_variant_id')) {
            Schema::table('frame_sizes', fn (Blueprint $table) => $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->nullOnDelete());
        }
        // Sizes must belong to a color variation — drop any leftover standalone rows
        DB::table('frame_sizes')->whereNull('product_variant_id')->delete();

        Schema::table('frame_sizes', function (Blueprint $table) {
            // Drop nullable FK if present, then re-add as required
            try {
                $table->dropForeign(['product_variant_id']);
            } catch (\Throwable $e) {
                // Column may exist without a named FK
            }
        });

        DB::statement('ALTER TABLE frame_sizes MODIFY product_variant_id BIGINT UNSIGNED NOT NULL');

        Schema::table('frame_sizes', function (Blueprint $table) {
            $table->foreign('product_variant_id')
                ->references('id')
                ->on('product_variants')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('frame_sizes', function (Blueprint $table) {
            $table->dropForeign(['product_variant_id']);
        });

        DB::statement('ALTER TABLE frame_sizes MODIFY product_variant_id BIGINT UNSIGNED NULL');

        Schema::table('frame_sizes', function (Blueprint $table) {
            $table->foreign('product_variant_id')
                ->references('id')
                ->on('product_variants')
                ->nullOnDelete();
        });
    }
};
