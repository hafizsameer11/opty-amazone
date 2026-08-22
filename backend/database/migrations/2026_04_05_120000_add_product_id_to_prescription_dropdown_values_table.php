<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescription_dropdown_values', function (Blueprint $table) {
            $table->dropUnique('prescription_dropdown_unique');
        });

        Schema::table('prescription_dropdown_values', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('category_id')->constrained('products')->onDelete('cascade');
            $table->index(['store_id', 'product_id'], 'pdv_store_product_idx');
            $table->unique(
                ['store_id', 'category_id', 'product_id', 'field_type', 'value', 'eye_type', 'form_type'],
                'prescription_dropdown_unique_v2'
            );
        });
    }

    public function down(): void
    {
        Schema::table('prescription_dropdown_values', function (Blueprint $table) {
            $table->dropUnique('prescription_dropdown_unique_v2');
            $table->dropIndex('pdv_store_product_idx');
            $table->dropConstrainedForeignId('product_id');
        });

        Schema::table('prescription_dropdown_values', function (Blueprint $table) {
            $table->unique(
                ['store_id', 'category_id', 'field_type', 'value', 'eye_type', 'form_type'],
                'prescription_dropdown_unique'
            );
        });
    }
};
