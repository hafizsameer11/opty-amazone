<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('is_boosted')->default(false)->after('is_featured');
            $table->timestamp('boosted_at')->nullable()->after('is_boosted');
            $table->index(['is_boosted', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['is_boosted', 'is_active']);
            $table->dropColumn(['is_boosted', 'boosted_at']);
        });
    }
};

