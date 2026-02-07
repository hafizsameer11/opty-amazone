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
        Schema::create('store_category_lens_coatings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->onDelete('cascade');
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->foreignId('lens_coating_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['store_id', 'category_id', 'lens_coating_id'], 'store_cat_coat_unique');
            $table->index('store_id');
            $table->index('category_id');
            $table->index('lens_coating_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_category_lens_coatings');
    }
};

