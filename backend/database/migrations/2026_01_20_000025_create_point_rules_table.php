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
        Schema::create('point_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type'); // 'purchase', 'referral', 'review', 'signup', 'birthday', 'social_share'
            $table->decimal('points_per_euro', 10, 2)->nullable(); // For purchase type
            $table->decimal('fixed_points', 10, 2)->nullable(); // For fixed point awards
            $table->decimal('min_purchase_amount', 10, 2)->nullable();
            $table->decimal('max_points_per_transaction', 10, 2)->nullable();
            $table->integer('points_expiry_days')->nullable(); // Null = no expiry
            $table->decimal('redemption_rate', 10, 2)->default(100); // Points per €1
            $table->decimal('min_redemption_points', 10, 2)->default(100);
            $table->decimal('max_redemption_per_order', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('conditions')->nullable();
            $table->timestamps();
            
            $table->index(['type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('point_rules');
    }
};
