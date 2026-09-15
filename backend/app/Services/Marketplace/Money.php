<?php

namespace App\Services\Marketplace;

use Illuminate\Validation\ValidationException;

final class Money
{
    public static function cents(string|int|float $amount): int
    {
        if (! preg_match('/^(-?)(\d{1,10})(?:\.(\d{1,2}))?$/D', (string) $amount, $m)) {
            throw ValidationException::withMessages(['amount' => 'Use an amount with at most two decimal places.']);
        }

        return ($m[1] === '-' ? -1 : 1) * ((int) $m[2] * 100 + (int) str_pad($m[3] ?? '', 2, '0'));
    }

    public static function decimal(int $cents): string
    {
        return ($cents < 0 ? '-' : '').intdiv(abs($cents), 100).'.'.str_pad((string) (abs($cents) % 100), 2, '0', STR_PAD_LEFT);
    }
}
