<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Existing seller gates/resources already require these SQL-import-only fields.
        foreach (['verification_submitted_at', 'store_setup_completed_at'] as $column) {
            if (! Schema::hasColumn('stores', $column)) {
                Schema::table('stores', fn (Blueprint $t) => $t->timestamp($column)->nullable());
            }
        }
    }

    public function down(): void
    {
        // Preserve legacy installation fields and recorded onboarding history.
    }
};
