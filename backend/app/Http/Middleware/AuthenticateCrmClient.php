<?php

namespace App\Http\Middleware;

use App\Helpers\ResponseHelper;
use App\Models\ApiClient;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates the read-only CRM integration.
 *
 * This is deliberately independent of the `sanctum` guard: a CRM key is not a
 * user token, cannot be exchanged for a session, and grants no access to
 * /api/admin/*, /api/seller/* or /api/buyer/*.
 */
class AuthenticateCrmClient
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('crm.enabled', true)) {
            return ResponseHelper::error('The CRM integration is disabled on this server.', null, 503);
        }

        $header = (string) config('crm.key_header', 'X-CRM-API-Key');
        $plainKey = trim((string) $request->header($header));

        if ($plainKey === '') {
            return ResponseHelper::unauthorized("Missing {$header} request header.");
        }

        // Uniform failure for unknown and revoked keys so the endpoint cannot
        // be used to probe which keys exist.
        $client = ApiClient::findByPlainKey($plainKey);

        if (! $client) {
            return ResponseHelper::unauthorized('Invalid or revoked CRM API key.');
        }

        if ($client->isExpired()) {
            return ResponseHelper::unauthorized('This CRM API key has expired.');
        }

        $ability = $this->abilityFor($request);

        if (! $client->can($ability)) {
            return ResponseHelper::error(
                "This CRM API key is not permitted to read the '{$ability}' resource.",
                null,
                403
            );
        }

        $limit = $client->effectiveRateLimit();
        $rateKey = 'crm:'.$client->getKey();

        if (RateLimiter::tooManyAttempts($rateKey, $limit)) {
            $retryAfter = RateLimiter::availableIn($rateKey);

            return ResponseHelper::error(
                'CRM API rate limit exceeded. Please retry later.',
                ['retry_after_seconds' => $retryAfter],
                429
            )->header('Retry-After', (string) $retryAfter);
        }

        RateLimiter::hit($rateKey, 60);

        $client->markUsed($request->ip());

        $request->attributes->set('crm_client', $client);
        $request->attributes->set('crm_client_ability', $ability);

        return $next($request);
    }

    /**
     * Derive the scope for this request from its route name, so abilities can
     * be granted per resource (e.g. ["overview", "orders"]).
     */
    private function abilityFor(Request $request): string
    {
        $name = (string) $request->route()?->getName();

        if ($name === '' || ! str_starts_with($name, 'crm.')) {
            return '*';
        }

        return (string) Str::after($name, 'crm.');
    }
}
