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
        Schema::create('store_category_lens_thickness_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('lens_thickness_material_id');
            $table->foreign('lens_thickness_material_id', 'fk_store_cat_thick_mat')->references('id')->on('lens_thickness_materials')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['store_id', 'category_id', 'lens_thickness_material_id'], 'store_cat_thick_mat_unique');
            $table->index('store_id', 'idx_store_cat_thick_mat_store');
            $table->index('category_id', 'idx_store_cat_thick_mat_cat');
            $table->index('lens_thickness_material_id', 'idx_store_cat_thick_mat_lens');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_category_lens_thickness_materials');
    }
};

