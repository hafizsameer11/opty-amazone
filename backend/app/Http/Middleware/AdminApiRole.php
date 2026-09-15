<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminApiRole
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->is('api/admin/*') && ! $request->is('api/admin/auth/login')) {
            $user = auth('sanctum')->user();
            abort_unless($user, 401, 'Unauthenticated.');
            abort_unless($user->isAdmin(), 403, 'Administrator access required.');
        }

        return $next($request);
    }
}
