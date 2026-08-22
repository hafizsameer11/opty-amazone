<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_chat_messages', function (Blueprint $table) {
            if (!Schema::hasColumn('store_chat_messages', 'attachment_path')) {
                $table->string('attachment_path')->nullable()->after('body');
            }
            if (!Schema::hasColumn('store_chat_messages', 'attachment_type')) {
                $table->string('attachment_type', 16)->nullable()->after('attachment_path');
            }
            if (!Schema::hasColumn('store_chat_messages', 'attachment_name')) {
                $table->string('attachment_name')->nullable()->after('attachment_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('store_chat_messages', function (Blueprint $table) {
            foreach (['attachment_name', 'attachment_type', 'attachment_path'] as $col) {
                if (Schema::hasColumn('store_chat_messages', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
