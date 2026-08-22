<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')
            ->where('is_approved', false)
            ->update([
                'is_approved' => true,
                'rejection_reason' => null,
            ]);

        // Change column default without doctrine/dbal
        DB::statement('ALTER TABLE products MODIFY is_approved TINYINT(1) NOT NULL DEFAULT 1');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE products MODIFY is_approved TINYINT(1) NOT NULL DEFAULT 0');
    }
};
