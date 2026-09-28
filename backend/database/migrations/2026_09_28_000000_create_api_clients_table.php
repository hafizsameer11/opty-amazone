<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('api_clients')) {
            return;
        }

        Schema::create('api_clients', function (Blueprint $table) {
            $table->id();

            // Human label for the operator, e.g. "LEO24 CRM (production)".
            $table->string('name');

            // SHA-256 of the plaintext key. The plaintext is shown once at
            // creation time and is never recoverable from this table.
            $table->string('key_hash', 64)->unique();

            // First characters of the plaintext key, so an operator can tell
            // two keys apart in a list without exposing either.
            $table->string('key_prefix', 12)->index();

            // Optional per-client scopes, e.g. ["overview","orders"].
            // Empty or null means "every read resource".
            $table->json('abilities')->nullable();

            $table->unsignedInteger('rate_limit_per_minute')->nullable();

            $table->timestamp('last_used_at')->nullable();
            $table->string('last_used_ip', 45)->nullable();

            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_clients');
    }
};
