<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // This guard keeps deployments safe when a migration was partially
        // applied or the Warehouse module was installed before draft support.
        if (! Schema::hasColumn('warehouse_products', 'is_draft')) {
            Schema::table('warehouse_products', function (Blueprint $table) {
                $table->boolean('is_draft')->default(false);
                $table->index(['is_draft', 'is_active'], 'wh_product_draft_active_ix');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('warehouse_products', 'is_draft')) {
            Schema::table('warehouse_products', function (Blueprint $table) {
                $table->dropIndex('wh_product_draft_active_ix');
                $table->dropColumn('is_draft');
            });
        }
    }
};
