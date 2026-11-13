<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('optical_grants', function (Blueprint $table) {
            if (! Schema::hasColumn('optical_grants', 'service')) {
                // Existing connections remain ordinary integrations. A seller
                // only becomes subscription-gated after a fresh 360 login.
                $table->string('service', 32)->default('integration')->after('client_id');
                $table->index(['service', 'store_id'], 'optical_grant_service_store');
            }
        });
    }

    public function down(): void
    {
        Schema::table('optical_grants', function (Blueprint $table) {
            if (Schema::hasColumn('optical_grants', 'service')) {
                $table->dropIndex('optical_grant_service_store');
                $table->dropColumn('service');
            }
        });
    }
};
