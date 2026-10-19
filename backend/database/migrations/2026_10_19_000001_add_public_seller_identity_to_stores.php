<?php

use App\Models\Store;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table): void {
            $table->string('seller_visibility', 16)->default('visible');
            $table->string('public_seller_code', 9)->nullable();
        });

        // Existing (including soft-deleted) stores need a stable code before
        // the unique index is installed. Codes are never recycled.
        Store::withTrashed()->orderBy('id')->eachById(function (Store $store): void {
            if ($store->public_seller_code) {
                return;
            }

            do {
                $code = 'VX-'.Str::upper(Str::random(6));
            } while (Store::withTrashed()->where('public_seller_code', $code)->exists());

            $store->forceFill(['public_seller_code' => $code])->saveQuietly();
        });

        Schema::table('stores', function (Blueprint $table): void {
            $table->unique('public_seller_code', 'stores_public_seller_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table): void {
            $table->dropUnique('stores_public_seller_code_unique');
            $table->dropColumn(['seller_visibility', 'public_seller_code']);
        });
    }
};
