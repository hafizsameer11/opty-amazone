<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) {
            $table->unsignedInteger('user_unread_count')->default(0)->after('status');
            $table->unsignedInteger('admin_unread_count')->default(0)->after('user_unread_count');
        });
    }
    public function down(): void
    {
        Schema::table('support_tickets', function (Blueprint $table) { $table->dropColumn(['user_unread_count', 'admin_unread_count']); });
    }
};
