<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_verification_challenges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 40)->default('buyer_registration');
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            // Explicit names keep MySQL identifiers well below its 64-character limit.
            $table->unique(['user_id', 'purpose'], 'evc_user_purpose_unique');
            $table->index('expires_at', 'evc_expires_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_challenges');
    }
};
