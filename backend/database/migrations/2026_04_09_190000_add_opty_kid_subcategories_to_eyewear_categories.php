<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();

        $eyeGlassesId = DB::table('categories')->where('slug', 'eye-glasses')->value('id');
        if ($eyeGlassesId) {
            DB::table('categories')->updateOrInsert(
                ['slug' => 'opty-kid-eye-glasses'],
                [
                    'name' => 'Opty kid',
                    'description' => null,
                    'parent_id' => $eyeGlassesId,
                    'sort_order' => 3,
                    'is_active' => true,
                    'deleted_at' => null,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }

        $sunGlassesId = DB::table('categories')->where('slug', 'sun-glasses')->value('id');
        if ($sunGlassesId) {
            DB::table('categories')->updateOrInsert(
                ['slug' => 'opty-kid-sun-glasses'],
                [
                    'name' => 'Opty kid',
                    'description' => null,
                    'parent_id' => $sunGlassesId,
                    'sort_order' => 3,
                    'is_active' => true,
                    'deleted_at' => null,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('categories')
            ->whereIn('slug', ['opty-kid-eye-glasses', 'opty-kid-sun-glasses'])
            ->delete();
    }
};

