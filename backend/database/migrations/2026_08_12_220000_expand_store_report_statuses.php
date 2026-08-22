<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Expand store_reports.status beyond pending/reviewed (additive; no drop/truncate).
     */
    public function up(): void
    {
        if (!Schema::hasTable('store_reports')) {
            return;
        }

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            // Widen to VARCHAR so new workflow statuses can be added without enum lock-in.
            DB::statement("ALTER TABLE store_reports MODIFY COLUMN status VARCHAR(64) NOT NULL DEFAULT 'submitted'");
        }

        // Map legacy values to the new workflow.
        DB::table('store_reports')->where('status', 'pending')->update(['status' => 'submitted']);
        DB::table('store_reports')->where('status', 'reviewed')->update(['status' => 'resolved']);
    }

    public function down(): void
    {
        if (!Schema::hasTable('store_reports')) {
            return;
        }

        DB::table('store_reports')->where('status', 'submitted')->update(['status' => 'pending']);
        DB::table('store_reports')->whereIn('status', [
            'under_review',
            'waiting_for_customer_response',
            'waiting_for_seller_response',
            'resolved',
            'rejected',
            'closed',
        ])->update(['status' => 'reviewed']);

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE store_reports MODIFY COLUMN status ENUM('pending', 'reviewed') NOT NULL DEFAULT 'pending'");
        }
    }
};
