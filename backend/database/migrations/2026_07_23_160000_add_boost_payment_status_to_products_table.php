<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'boost_payment_status')) {
                $table->string('boost_payment_status', 32)->nullable()->after('boost_end_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'boost_payment_status')) {
                $table->dropColumn('boost_payment_status');
            }
        });
    }
};
