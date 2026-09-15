<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class MarketplaceRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        abort_unless($request->user()?->role === $role, 403, 'This account cannot access this area.');

        return $next($request);
    }
}
