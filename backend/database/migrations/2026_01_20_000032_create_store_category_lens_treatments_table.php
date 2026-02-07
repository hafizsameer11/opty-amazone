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
        Schema::create('store_category_lens_treatments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->foreignId('lens_treatment_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['store_id', 'category_id', 'lens_treatment_id']);
            $table->index('store_id');
            $table->index('category_id');
            $table->index('lens_treatment_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_category_lens_treatments');
    }
};

