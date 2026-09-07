<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Free-text size labels (e.g. "12mm", "Medium") — dimensions optional
        DB::statement('ALTER TABLE frame_sizes MODIFY lens_width DECIMAL(5,2) NOT NULL DEFAULT 0');
        DB::statement('ALTER TABLE frame_sizes MODIFY bridge_width DECIMAL(5,2) NOT NULL DEFAULT 0');
        DB::statement('ALTER TABLE frame_sizes MODIFY temple_length DECIMAL(5,2) NOT NULL DEFAULT 0');
        DB::statement('ALTER TABLE frame_sizes MODIFY size_label VARCHAR(100) NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE frame_sizes MODIFY lens_width DECIMAL(5,2) NOT NULL');
        DB::statement('ALTER TABLE frame_sizes MODIFY bridge_width DECIMAL(5,2) NOT NULL');
        DB::statement('ALTER TABLE frame_sizes MODIFY temple_length DECIMAL(5,2) NOT NULL');
        DB::statement('ALTER TABLE frame_sizes MODIFY size_label VARCHAR(50) NULL');
    }
};
