<?php

namespace App\Services\Ads;

use Illuminate\Validation\ValidationException;

final class AdMoney
{
    public static function cents(string|int|float $amount): int
    {
        $value = (string) $amount;
        if (! preg_match('/^\d{1,10}(?:\.\d{1,2})?$/D', $value)) {
            throw ValidationException::withMessages(['amount' => 'Use a positive amount with at most two decimal places.']);
        }
        [$whole, $fraction] = array_pad(explode('.', $value), 2, '0');

        return (int) $whole * 100 + (int) str_pad($fraction, 2, '0');
    }

    public static function decimal(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
