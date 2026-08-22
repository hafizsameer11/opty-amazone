<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('store_reports')) {
            Schema::create('store_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->string('reason');
                $table->text('details')->nullable();
                $table->json('evidence_paths')->nullable();
                $table->string('status', 64)->default('submitted');
                $table->text('admin_notes')->nullable();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();

                $table->index(['store_id', 'status']);
                $table->index(['buyer_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('store_reports');
    }
};
