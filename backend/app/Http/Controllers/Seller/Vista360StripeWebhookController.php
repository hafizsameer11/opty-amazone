<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Services\Vista360\Vista360SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Vista360StripeWebhookController extends Controller
{
    public function __invoke(Request $request, Vista360SubscriptionService $subscriptions): JsonResponse
    {
        $secret = (string) config('vista360.stripe_webhook_secret');
        abort_unless(strlen($secret) >= 16, 503, 'Vista Express 360 webhook is not configured.');
        $signature = (string) $request->header('Stripe-Signature');
        abort_unless($this->validSignature($signature, $request->getContent(), $secret), 400, 'Invalid Stripe signature.');
        $event = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
        abort_unless(is_array($event), 400, 'Invalid Stripe event.');

        return response()->json($subscriptions->handleStripeEvent($event));
    }

    private function validSignature(string $header, string $body, string $secret): bool
    {
        $parts = [];
        foreach (explode(',', $header) as $entry) {
            [$key, $value] = array_pad(explode('=', trim($entry), 2), 2, null);
            if ($key && $value) {
                $parts[$key][] = $value;
            }
        }
        $timestamp = $parts['t'][0] ?? null;
        if (! is_string($timestamp) || ! ctype_digit($timestamp) || abs(time() - (int) $timestamp) > 300) {
            return false;
        }
        $expected = hash_hmac('sha256', $timestamp.'.'.$body, $secret);
        foreach ($parts['v1'] ?? [] as $candidate) {
            if (hash_equals($expected, $candidate)) {
                return true;
            }
        }
        return false;
    }
}
