<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Historic immediate campaigns may retain the time at which the Seller
     * drafted them. The product rule is that they start when approved.
     */
    public function up(): void
    {
        DB::table('referral_campaigns')
            ->where('activation_mode', 'immediate')
            ->where('approval_status', 'approved')
            ->whereNotNull('approved_at')
            ->update(['starts_at' => DB::raw('approved_at')]);
    }

    public function down(): void
    {
        // The original draft time cannot be reconstructed safely.
    }
};
