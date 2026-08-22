<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class PlatformSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $all = static::allCached();

        return array_key_exists($key, $all) ? $all[$key] : $default;
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) || is_array($value) || is_int($value) || is_float($value)
                ? json_encode($value)
                : (string) $value]
        );

        Cache::forget('platform_settings_map');
    }

    /**
     * @return array<string, mixed>
     */
    public static function allCached(): array
    {
        return Cache::remember('platform_settings_map', 300, function () {
            $map = [];
            foreach (static::query()->get() as $row) {
                $raw = $row->value;
                $decoded = json_decode((string) $raw, true);
                $map[$row->key] = json_last_error() === JSON_ERROR_NONE ? $decoded : $raw;
            }

            return $map;
        });
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public static function setMany(array $values): void
    {
        foreach ($values as $key => $value) {
            static::setValue($key, $value);
        }
    }
}
