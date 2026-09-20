<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Preserve legacy coupons while bringing their counters/code display forward. */
    public function up(): void
    {
        if (! Schema::hasTable('coupons') || ! Schema::hasTable('coupon_usages')) return;

        $coupons = DB::table('coupons')->select('id', 'code')->orderBy('id')->get();
        $groups = $coupons->groupBy(fn ($coupon) => strtoupper(trim((string) $coupon->code)));
        foreach ($groups as $normalised => $matches) {
            // Do not manufacture a unique-key conflict from historic codes that
            // only differ by case. They remain readable case-insensitively.
            if ($normalised !== '' && $matches->count() === 1 && $matches->first()->code !== $normalised) {
                DB::table('coupons')->where('id', $matches->first()->id)->update(['code' => $normalised]);
            }
        }

        foreach (DB::table('coupons')->select('id')->orderBy('id')->cursor() as $coupon) {
            DB::table('coupons')->where('id', $coupon->id)->update([
                'usage_count' => DB::table('coupon_usages')->where('coupon_id', $coupon->id)->where('status', 'redeemed')->count(),
                'reserved_count' => DB::table('coupon_usages')->where('coupon_id', $coupon->id)->where('status', 'reserved')->count(),
            ]);
        }
    }

    public function down(): void
    {
        // Counters are derived data; rolling back the schema upgrade removes them.
    }
};
