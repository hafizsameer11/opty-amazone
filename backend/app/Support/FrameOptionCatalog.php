<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * Canonical catalogue values used by both product creation APIs and seller
 * clients. Existing product values are accepted during an edit so a legacy
 * listing can be updated without silently losing its saved frame metadata.
 */
final class FrameOptionCatalog
{
    public const SHAPES = [
        'Round', 'Oval', 'Square', 'Rectangle', 'Cat-Eye', 'Aviator',
        'Geometric', 'Wayfarer', 'Browline', 'Clubmaster', 'Rimless', 'Oversized',
    ];

    public const MATERIALS = [
        'Acetate', 'Metal', 'Titanium', 'Stainless Steel', 'TR90', 'Combination',
        'Plastic', 'Wood', 'Carbon Fibre',
    ];

    /** @var array<string, string> Stored value => CSS colour preview. */
    public const COLORS = [
        'Black' => '#111827', 'Tortoise' => '#6B4423', 'Brown' => '#7C4A2D',
        'Transparent' => '#F8FAFC', 'Grey' => '#64748B', 'Silver' => '#B8C2CC',
        'Gold' => '#D4A017', 'Rose Gold' => '#B76E79', 'Red' => '#DC2626',
        'Blue' => '#2563EB', 'Green' => '#15803D', 'Purple' => '#7E22CE',
        'Pink' => '#EC4899', 'White' => '#FFFFFF', 'Yellow' => '#EAB308',
    ];

    /** @return array<int, mixed> */
    public static function shapeRules(?string $legacy = null): array
    {
        return self::rules(self::SHAPES, $legacy);
    }

    /** @return array<int, mixed> */
    public static function materialRules(?string $legacy = null): array
    {
        return self::rules(self::MATERIALS, $legacy);
    }

    /** @return array<int, mixed> */
    public static function colorRules(?string $legacy = null): array
    {
        // The palette gives sellers quick, consistent choices, while a valid
        // CSS hex value keeps the native colour picker useful for shades that
        // are not in the predefined list.  The current legacy value remains
        // accepted during an edit so existing listings are never blocked.
        return ['nullable', 'string', 'max:64', function (string $attribute, mixed $value, \Closure $fail) use ($legacy): void {
            if ($value === null || $value === '') {
                return;
            }

            $isKnownName = in_array($value, array_keys(self::COLORS), true);
            $isHexColour = is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) === 1;
            if (! $isKnownName && ! $isHexColour && $value !== $legacy) {
                $fail("The {$attribute} must be a common colour or a six-digit hex colour.");
            }
        }];
    }

    /** @param array<int, string> $values @return array<int, mixed> */
    private static function rules(array $values, ?string $legacy): array
    {
        return ['nullable', 'string', 'max:64', Rule::in(array_values(array_unique([
            ...$values,
            ...($legacy ? [$legacy] : []),
        ])))];
    }
}
