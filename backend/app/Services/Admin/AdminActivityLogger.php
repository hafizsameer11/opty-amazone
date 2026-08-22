<?php

namespace App\Services\Admin;

use App\Models\AdminActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

class AdminActivityLogger
{
    public static function log(
        ?User $admin,
        string $action,
        ?string $resourceType = null,
        ?int $resourceId = null,
        bool $success = true,
        ?array $details = null,
        ?Request $request = null
    ): void {
        try {
            AdminActivityLog::create([
                'admin_id' => $admin?->id,
                'action' => $action,
                'resource_type' => $resourceType,
                'resource_id' => $resourceId,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
                'success' => $success,
                'details' => $details,
            ]);
        } catch (\Throwable $e) {
            // Never break admin actions because of logging
            report($e);
        }
    }
}
