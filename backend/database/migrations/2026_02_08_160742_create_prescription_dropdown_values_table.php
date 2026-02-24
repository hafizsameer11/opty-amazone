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
        Schema::create('prescription_dropdown_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->enum('field_type', ['sph', 'cyl', 'axis', 'pd', 'h', 'year_of_birth', 'add', 'base_curve', 'diameter']);
            $table->string('value', 50);
            $table->string('label', 100)->nullable();
            $table->enum('eye_type', ['left', 'right', 'both'])->nullable();
            $table->enum('form_type', ['distance_vision', 'near_vision', 'progressive', 'contact_lens'])->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            // Unique constraint to prevent duplicates
            $table->unique(['store_id', 'category_id', 'field_type', 'value', 'eye_type', 'form_type'], 'prescription_dropdown_unique');
            
            // Indexes for performance
            $table->index('store_id');
            $table->index('category_id');
            $table->index('field_type');
            $table->index('is_active');
            $table->index(['store_id', 'category_id', 'field_type'], 'pdv_store_cat_field_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prescription_dropdown_values');
    }
};
