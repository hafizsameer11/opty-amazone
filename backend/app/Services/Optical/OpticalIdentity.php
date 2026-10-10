<?php

namespace App\Services\Optical;

use App\Models\Store;
use App\Models\User;

class OpticalIdentity
{
    public const SCOPES = ['identity', 'catalog.read', 'orders.read', 'customers.read', 'catalog.publish'];

    public static function configured(): void
    {
        abort_unless(config('optical.enabled') && strlen((string) config('optical.client_secret')) >= 32 && config('optical.redirect_uri'), 503, 'Optical Shop connection is not configured.');
        $redirect = parse_url(config('optical.redirect_uri'));
        abort_unless(($redirect['scheme'] ?? '') === 'https' || (app()->environment(['local', 'testing']) && ($redirect['scheme'] ?? '') === 'http' && in_array($redirect['host'] ?? '', ['localhost', '127.0.0.1'])), 503, 'A secure registered redirect is required.');
    }

    public static function store(User $user): Store
    {
        abort_unless($user->role === 'seller' && ! $user->is_blocked, 403, 'This seller account is unavailable.');
        $verification = ! app()->environment(['local', 'testing']) || config('optical.require_verified_email');
        abort_if($verification && ! $user->hasVerifiedEmail(), 403, 'Verify your Vista Express seller email before connecting.');
        $store = $user->store;
        abort_unless($store && $store->status === 'active' && $store->is_active, 403, 'An active approved seller store is required.');

        return $store;
    }

    public static function payload(User $u, Store $s): array
    {
        return ['subject' => (string) $u->id, 'email' => $u->email, 'email_verified' => $u->hasVerifiedEmail(), 'name' => $u->name,
            'store' => ['id' => (string) $s->id, 'name' => $s->name, 'status' => $s->status, 'phone' => $s->phone], 'currency' => config('optical.currency')];
    }
}
