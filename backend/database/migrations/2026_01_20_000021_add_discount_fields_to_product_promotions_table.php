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
        Schema::table('product_promotions', function (Blueprint $table) {
            $table->enum('discount_type', ['budget', 'percentage', 'fixed'])->default('budget')->after('budget');
            $table->decimal('discount_value', 10, 2)->nullable()->after('discount_type');
            $table->boolean('applies_to_price')->default(false)->after('discount_value');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_promotions', function (Blueprint $table) {
            $table->dropColumn(['discount_type', 'discount_value', 'applies_to_price']);
        });
    }
};
