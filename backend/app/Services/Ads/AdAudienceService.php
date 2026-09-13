<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\User;
use Illuminate\Http\Request;

class AdAudienceService
{
    public function user(Request $request): ?User
    {
        return $request->user('sanctum');
    }

    public function fingerprint(Request $request): string
    {
        // Never store raw IP addresses. Do not trust arbitrary forwarded/geolocation headers.
        return hash_hmac('sha256', $request->ip().'|'.substr($request->userAgent() ?? '', 0, 512), config('app.key'));
    }

    public function location(Request $request): string
    {
        $user = $this->user($request);

        return $user?->addresses()->where('is_default', true)->with('country')->first()?->country?->code ?? 'unknown';
    }

    public function matches(AdCampaign $c, Request $request, string $location): bool
    {
        $user = $this->user($request);
        if ($user && ($user->is_blocked || ! $user->isBuyer() || $user->id === $c->seller_id)) {
            return false;
        }

        return in_array('global', $c->locations, true) || ($location !== 'unknown' && in_array($location, $c->locations, true));
    }
}
