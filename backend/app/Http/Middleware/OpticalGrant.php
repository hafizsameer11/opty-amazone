<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Optical\OpticalIdentity;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OpticalGrant
{
    public function handle(Request $r, Closure $next, string $scope = 'identity')
    {
        OpticalIdentity::configured();
        $token = $r->bearerToken();
        abort_unless(is_string($token) && preg_match('/^vos_[A-Za-z0-9]{64}$/D', $token), 401);
        $grant = DB::table('optical_grants')->where('token_hash', hash('sha256', $token))->whereNull('revoked_at')->where('expires_at', '>', now())->first();
        abort_unless($grant && $grant->client_id === config('optical.client_id'), 401, 'Connection expired or revoked.');
        abort_unless(in_array($scope, json_decode($grant->scopes, true)), 403);
        $user = User::findOrFail($grant->user_id);
        $store = OpticalIdentity::store($user);
        abort_unless($store->id === (int) $grant->store_id, 403);
        $r->attributes->set('optical_grant', $grant);
        $r->attributes->set('optical_store', $store);
        $r->attributes->set('optical_user', $user);

        return $next($r);
    }
}
