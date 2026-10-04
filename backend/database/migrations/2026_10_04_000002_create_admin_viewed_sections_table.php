<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_viewed_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->cascadeOnDelete();
            $table->string('section', 64);
            $table->timestamp('viewed_at');
            $table->timestamps();

            $table->unique(['admin_id', 'section']);
            $table->index('section');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_viewed_sections');
    }
};