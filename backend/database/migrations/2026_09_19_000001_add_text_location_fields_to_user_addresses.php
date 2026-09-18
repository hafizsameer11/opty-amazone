<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            $table->string('country_name')->nullable()->after('country_id');
            $table->string('state_name')->nullable()->after('state_id');
            $table->string('city_name')->nullable()->after('city_id');
        });
    }

    public function down(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            $table->dropColumn(['country_name', 'state_name', 'city_name']);
        });
    }
};
