<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A machine identity for the read-only CRM integration.
 *
 * Keys are stored only as a SHA-256 hash, so this table can never be used to
 * impersonate a client even if the database is exposed.
 */
class ApiClient extends Model
{
    protected $fillable = [
        'name',
        'key_hash',
        'key_prefix',
        'abilities',
        'rate_limit_per_minute',
        'expires_at',
    ];

    protected $hidden = [
        'key_hash',
    ];

    protected function casts(): array
    {
        return [
            'abilities' => 'array',
            'last_used_at' => 'datetime',
            'revoked_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    /**
     * Generate a new plaintext key. The value is returned exactly once, to the
     * caller of the artisan command; only its hash is written here.
     */
    public static function generateKey(): string
    {
        return 'crm_'.bin2hex(random_bytes(24));
    }

    public static function hashKey(string $plainKey): string
    {
        return hash('sha256', $plainKey);
    }

    public static function prefixOf(string $plainKey): string
    {
        return substr($plainKey, 0, 12);
    }

    /**
     * Resolve a plaintext key to its client, or null when unknown/revoked.
     */
    public static function findByPlainKey(string $plainKey): ?self
    {
        return static::query()
            ->where('key_hash', self::hashKey($plainKey))
            ->whereNull('revoked_at')
            ->first();
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isActive(): bool
    {
        return $this->revoked_at === null && ! $this->isExpired();
    }

    public function effectiveRateLimit(): int
    {
        return $this->rate_limit_per_minute ?: (int) config('crm.default_rate_limit', 120);
    }

    /**
     * A client with no declared abilities may read everything; otherwise the
     * ability must be listed explicitly.
     */
    public function can(string $ability): bool
    {
        if (empty($this->abilities)) {
            return true;
        }

        return in_array('*', $this->abilities, true)
            || in_array($ability, $this->abilities, true);
    }

    public function markUsed(?string $ip = null): void
    {
        $this->forceFill([
            'last_used_at' => Carbon::now(),
            'last_used_ip' => $ip,
        ])->saveQuietly();
    }

    public function revoke(): bool
    {
        return $this->forceFill(['revoked_at' => Carbon::now()])->save();
    }

    public function allowedScopes(): array
    {
        return $this->abilities ?: ['*'];
    }
}
