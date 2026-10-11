<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('optical_product_links', fn (Blueprint $table) => $table->json('option_map')->nullable());
    }

    public function down(): void
    {
        Schema::table('optical_product_links', fn (Blueprint $table) => $table->dropColumn('option_map'));
    }
};
