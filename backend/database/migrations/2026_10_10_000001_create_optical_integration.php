<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('optical_authorization_codes', function (Blueprint $t) {
            $t->string('code_hash', 64)->primary();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('store_id')->constrained()->cascadeOnDelete();
            $t->string('client_id', 100);
            $t->text('redirect_uri');
            $t->string('challenge', 43);
            $t->timestamp('expires_at');
            $t->timestamp('used_at')->nullable();
        });
        Schema::create('optical_grants', function (Blueprint $t) {
            $t->id();
            $t->string('token_hash', 64)->unique();
            $t->foreignId('user_id')->constrained()->cascadeOnDelete();
            $t->foreignId('store_id')->constrained()->cascadeOnDelete();
            $t->string('client_id', 100);
            $t->json('scopes');
            $t->timestamp('expires_at');
            $t->timestamp('revoked_at')->nullable();
            $t->timestamps();
        });
        Schema::create('optical_product_links', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->constrained()->restrictOnDelete();
            $t->string('client_id', 100);
            $t->uuid('external_key');
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->timestamps();
            $t->unique(['store_id', 'client_id', 'external_key'], 'optical_product_external_unique');
        });
        Schema::create('optical_operations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('store_id')->constrained()->restrictOnDelete();
            $t->string('client_id', 100);
            $t->uuid('operation_key');
            $t->string('payload_hash', 64);
            $t->json('result');
            $t->timestamps();
            $t->unique(['store_id', 'client_id', 'operation_key'], 'optical_operation_unique');
        });
        Schema::create('optical_images', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignId('store_id')->constrained()->restrictOnDelete();
            $t->string('client_id', 100);
            $t->string('sha256', 64);
            $t->string('storage_key');
            $t->foreignId('product_id')->nullable()->constrained()->restrictOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['optical_images', 'optical_operations', 'optical_product_links', 'optical_grants', 'optical_authorization_codes'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
