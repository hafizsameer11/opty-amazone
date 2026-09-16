<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The referral system may be deployed into an existing installation,
        // while fresh installations receive this column in the create migration.
        if (! Schema::hasTable('referral_campaigns') || Schema::hasColumn('referral_campaigns', 'activation_mode')) {
            return;
        }

        Schema::table('referral_campaigns', function (Blueprint $table) {
            $table->string('activation_mode', 16)->default('immediate');
        });
    }

    public function down(): void
    {
        if (Schema::hasTable('referral_campaigns') && Schema::hasColumn('referral_campaigns', 'activation_mode')) {
            Schema::table('referral_campaigns', function (Blueprint $table) {
                $table->dropColumn('activation_mode');
            });
        }
    }
};
