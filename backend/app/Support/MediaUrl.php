<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class MediaUrl
{
    /** Absolute public URL for a storage path or any stored media URL. */
    public static function absolute(?string $pathOrUrl): ?string
    {
        if ($pathOrUrl === null || trim($pathOrUrl) === '') {
            return null;
        }

        $value = trim($pathOrUrl);

        // Rewrite legacy localhost URLs to current APP_URL
        $value = preg_replace(
            '#^https?://(localhost|127\.0\.0\.1)(:\d+)?#i',
            rtrim((string) config('app.url'), '/'),
            $value
        ) ?? $value;

        if (preg_match('#^https?://#i', $value)) {
            return $value;
        }

        // Relative /storage/... or bare path
        $path = ltrim($value, '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return Storage::disk('public')->url($path);
    }
}
