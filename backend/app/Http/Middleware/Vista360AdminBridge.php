<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates the private Vista Express 360 administration bridge.
 *
 * Browser sessions are intentionally never forwarded from the CRM Admin into
 * the Marketplace. The CRM server signs each short-lived request instead, and
 * this middleware rejects stale, modified and replayed requests before any
 * subscription data is read or changed.
 */
class Vista360AdminBridge
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless((bool) config('vista360.admin_bridge_enabled'), 404);
        $secret = (string) config('vista360.admin_bridge_secret');
        abort_unless(strlen($secret) >= 32, 503, 'Vista Express 360 administration bridge is not configured.');

        $timestamp = (string) $request->header('X-Vista360-Bridge-Timestamp');
        $nonce = (string) $request->header('X-Vista360-Bridge-Nonce');
        $signature = (string) $request->header('X-Vista360-Bridge-Signature');
        abort_unless(ctype_digit($timestamp) && abs(time() - (int) $timestamp) <= 300, 401, 'The administration bridge request has expired.');
        abort_unless(preg_match('/^[A-Za-z0-9_-]{16,128}$/D', $nonce) === 1, 401, 'The administration bridge request is invalid.');
        abort_unless(preg_match('/^[a-f0-9]{64}$/D', $signature) === 1, 401, 'The administration bridge signature is invalid.');

        $payload = implode("\n", [
            $timestamp,
            strtoupper($request->method()),
            $request->getRequestUri(),
            $nonce,
            $request->getContent(),
        ]);
        $expected = hash_hmac('sha256', $payload, $secret);
        abort_unless(hash_equals($expected, $signature), 401, 'The administration bridge signature is invalid.');

        // A nonce can be used once only. This stops a captured write request
        // from being replayed during its otherwise-valid five-minute window.
        abort_unless(Cache::add('vista360-admin-bridge:'.hash('sha256', $nonce), true, now()->addMinutes(6)), 409, 'This administration bridge request was already used.');

        return $next($request);
    }
}
