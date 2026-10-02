<?php

namespace App\Http\Middleware;

use App\Helpers\ResponseHelper;
use Closure;
use Illuminate\Http\Request;

class MarketplaceRole
{
    public function handle(Request $request, Closure $next, string $role)
    {
        abort_unless($request->user()?->role === $role, 403, 'This account cannot access this area.');

        // A suspended seller may still read the state needed by the dedicated
        // suspension screen, submit a single reinstatement request, and sign
        // out. Every normal Seller Hub API is stopped server-side as well as
        // by the frontend gate, so a copied API request cannot bypass it.
        if ($role === 'seller') {
            $store = $request->user()->store;
            $isSuspended = $store && ($store->status === 'suspended' || ! $store->is_active);
            $allowedWhileSuspended = ($request->isMethod('get') && $request->is('api/seller/store'))
                || $request->is('api/seller/store/reinstatement-requests')
                || $request->is('api/seller/auth/logout');
            if ($isSuspended && ! $allowedWhileSuspended) {
                return ResponseHelper::error('This store is suspended. Submit a reinstatement request to restore access.', ['code' => 'store_suspended'], 403);
            }
        }

        return $next($request);
    }
}
