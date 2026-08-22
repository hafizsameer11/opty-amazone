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
        $kidsEyeId = DB::table('categories')->where('slug', 'kids-eye-glasses')->value('id');
        $kidsSunId = DB::table('categories')->where('slug', 'kids-sun-glasses')->value('id');
        $optyEyeId = DB::table('categories')->where('slug', 'opty-kid-eye-glasses')->value('id');
        $optySunId = DB::table('categories')->where('slug', 'opty-kid-sun-glasses')->value('id');

        if ($optyEyeId && $kidsEyeId) {
            DB::table('products')
                ->where('sub_category_id', $optyEyeId)
                ->update(['sub_category_id' => $kidsEyeId, 'updated_at' => now()]);
        }

        if ($optySunId && $kidsSunId) {
            DB::table('products')
                ->where('sub_category_id', $optySunId)
                ->update(['sub_category_id' => $kidsSunId, 'updated_at' => now()]);
        }

        DB::table('categories')
            ->whereIn('slug', ['opty-kid-eye-glasses', 'opty-kid-sun-glasses'])
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally no-op: deleted opty-kid categories are not restored automatically.
    }
};

