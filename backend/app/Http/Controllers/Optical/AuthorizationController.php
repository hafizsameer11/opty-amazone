<?php

namespace App\Http\Controllers\Optical;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Optical\OpticalIdentity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthorizationController extends Controller
{
    public function show(Request $r)
    {
        OpticalIdentity::configured();
        $d = $r->validate(['client_id' => 'required|string|max:100', 'redirect_uri' => 'required|string|max:1000', 'state' => 'required|string|regex:/^[A-Za-z0-9_-]{32,128}$/D', 'code_challenge' => 'required|string|size:43|regex:/^[A-Za-z0-9_-]+$/D', 'code_challenge_method' => 'required|in:S256']);
        abort_unless(hash_equals(config('optical.client_id'), $d['client_id']) && hash_equals(config('optical.redirect_uri'), $d['redirect_uri']), 400, 'Unregistered application redirect.');
        $locale = $r->validate(['locale' => 'sometimes|in:en,it'])['locale'] ?? $r->session()->get('optical_locale', 'en');
        $r->session()->put('optical_locale', $locale);
        $previous = $r->session()->get('optical_authorize');
        $expires = $previous && array_intersect_key($previous, $d) === $d ? $previous['expires'] : now()->addMinutes(10)->timestamp;
        $r->session()->put('optical_authorize', [...$d, 'expires' => $expires]);

        return response()->view('optical.authorize', ['redirectHost' => parse_url($d['redirect_uri'], PHP_URL_HOST), 'locale' => $locale, 'flow' => $d])->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer')->header('X-Frame-Options', 'DENY');
    }

    public function approve(Request $r)
    {
        OpticalIdentity::configured();
        $flow = $r->session()->get('optical_authorize');
        $locale = $r->validate(['locale' => 'sometimes|in:en,it'])['locale'] ?? $r->session()->get('optical_locale', 'en');
        $r->session()->put('optical_locale', $locale);
        $it = $locale === 'it';
        abort_unless($flow && $flow['expires'] > time(), 419, $it ? 'Richiesta scaduta. Ricomincia da Vista Express 360.' : 'Connection request expired. Start again from Vista Express 360.');
        $d = $r->validate(['email' => 'required|email:rfc|max:254', 'password' => 'required|string|max:200', 'consent' => 'accepted'], $it ? ['email.required' => 'Inserisci la tua email.', 'email.email' => 'Inserisci un indirizzo email valido.', 'email.max' => 'Email troppo lunga.', 'password.required' => 'Inserisci la password.', 'password.max' => 'Password troppo lunga.', 'consent.accepted' => 'Autorizza il collegamento per continuare.'] : []);
        $u = User::where('email', strtolower(trim($d['email'])))->first();
        $valid = Hash::check($d['password'], $u?->password ?? '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.');
        if (! $u || ! $valid || $u->role !== 'seller' || $u->is_blocked) {
            throw ValidationException::withMessages(['email' => $it ? 'Le credenziali del venditore non sono valide o disponibili.' : 'The seller credentials are invalid or unavailable.']);
        }
        try {
            $store = OpticalIdentity::store($u);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            if ($e->getStatusCode() !== 403) throw $e;
            $message = $it ? match ($e->getMessage()) {
                'Verify your Vista Express seller email before connecting.' => 'Verifica la tua email venditore Vista Express prima di collegarti.',
                'An active approved seller store is required.' => 'È necessario un negozio venditore attivo e approvato.',
                default => 'Questo account venditore non è disponibile.',
            } : $e->getMessage();
            return response()->view('optical.authorize', ['redirectHost' => parse_url($flow['redirect_uri'], PHP_URL_HOST),
                'locale' => $locale, 'flow' => array_diff_key($flow, ['expires' => true]),
                'errors' => (new \Illuminate\Support\ViewErrorBag())->put('default', new \Illuminate\Support\MessageBag(['email' => $message])),
            ], 403)->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer')->header('X-Frame-Options', 'DENY');
        }
        $code = Str::random(64);
        DB::table('optical_authorization_codes')->insert(['code_hash' => hash('sha256', $code), 'user_id' => $u->id, 'store_id' => $store->id, 'client_id' => $flow['client_id'], 'redirect_uri' => $flow['redirect_uri'], 'challenge' => $flow['code_challenge'], 'expires_at' => now()->addMinutes(2)]);
        $r->session()->forget('optical_authorize');
        $r->session()->regenerate();

        // No call to AuthService::login: existing seller and mobile tokens remain intact.
        return redirect()->away($flow['redirect_uri'].'?'.http_build_query(['code' => $code, 'state' => $flow['state']]))->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
    }

    public function token(Request $r)
    {
        OpticalIdentity::configured();
        $d = $r->validate(['client_id' => 'required|string', 'client_secret' => 'required|string', 'code' => 'required|string|size:64', 'redirect_uri' => 'required|string', 'code_verifier' => 'required|string|min:43|max:128|regex:/^[A-Za-z0-9._~-]+$/D']);
        abort_unless(hash_equals(config('optical.client_id'), $d['client_id']) && hash_equals(config('optical.client_secret'), $d['client_secret']) && hash_equals(config('optical.redirect_uri'), $d['redirect_uri']), 401, 'Invalid client.');
        $result = DB::transaction(function () use ($d) {
            $code = DB::table('optical_authorization_codes')->where('code_hash', hash('sha256', $d['code']))->lockForUpdate()->first();
            $challenge = rtrim(strtr(base64_encode(hash('sha256', $d['code_verifier'], true)), '+/', '-_'), '=');
            abort_unless($code && ! $code->used_at && $code->expires_at > now() && hash_equals($code->challenge, $challenge) && $code->client_id === $d['client_id'] && $code->redirect_uri === $d['redirect_uri'], 400, 'Authorization code invalid, expired or already used.');
            $u = User::findOrFail($code->user_id);
            $s = OpticalIdentity::store($u);
            abort_unless($s->id === (int) $code->store_id, 403);
            abort_unless(DB::table('optical_authorization_codes')->where('code_hash', $code->code_hash)->whereNull('used_at')->update(['used_at' => now()]) === 1, 400);
            $token = 'vos_'.Str::random(64);
            $expires = now()->addDays(config('optical.grant_days'));
            DB::table('optical_grants')->insert(['token_hash' => hash('sha256', $token), 'user_id' => $u->id, 'store_id' => $s->id, 'client_id' => $d['client_id'], 'scopes' => json_encode(OpticalIdentity::SCOPES), 'expires_at' => $expires, 'created_at' => now(), 'updated_at' => now()]);

            return ['access_token' => $token, 'token_type' => 'Bearer', 'expires_at' => $expires->toIso8601String(), 'identity' => OpticalIdentity::payload($u, $s), 'scopes' => OpticalIdentity::SCOPES];
        });

        return response()->json($result)->header('Cache-Control', 'no-store');
    }

    public function identity(Request $r)
    {
        return ['data' => OpticalIdentity::payload($r->attributes->get('optical_user'), $r->attributes->get('optical_store'))];
    }

    public function revoke(Request $r)
    {
        DB::table('optical_grants')->where('id', $r->attributes->get('optical_grant')->id)->update(['revoked_at' => now()]);

        return response()->noContent();
    }
}
