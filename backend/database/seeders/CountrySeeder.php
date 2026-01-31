<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $countries = [
            ['name' => 'United States', 'code' => 'USA', 'phone_code' => '+1', 'currency_code' => 'USD'],
            ['name' => 'United Kingdom', 'code' => 'GBR', 'phone_code' => '+44', 'currency_code' => 'GBP'],
            ['name' => 'Canada', 'code' => 'CAN', 'phone_code' => '+1', 'currency_code' => 'CAD'],
            ['name' => 'Australia', 'code' => 'AUS', 'phone_code' => '+61', 'currency_code' => 'AUD'],
            ['name' => 'Germany', 'code' => 'DEU', 'phone_code' => '+49', 'currency_code' => 'EUR'],
            ['name' => 'France', 'code' => 'FRA', 'phone_code' => '+33', 'currency_code' => 'EUR'],
            ['name' => 'Italy', 'code' => 'ITA', 'phone_code' => '+39', 'currency_code' => 'EUR'],
            ['name' => 'Spain', 'code' => 'ESP', 'phone_code' => '+34', 'currency_code' => 'EUR'],
            ['name' => 'Netherlands', 'code' => 'NLD', 'phone_code' => '+31', 'currency_code' => 'EUR'],
            ['name' => 'Belgium', 'code' => 'BEL', 'phone_code' => '+32', 'currency_code' => 'EUR'],
            ['name' => 'Switzerland', 'code' => 'CHE', 'phone_code' => '+41', 'currency_code' => 'CHF'],
            ['name' => 'Austria', 'code' => 'AUT', 'phone_code' => '+43', 'currency_code' => 'EUR'],
            ['name' => 'Sweden', 'code' => 'SWE', 'phone_code' => '+46', 'currency_code' => 'SEK'],
            ['name' => 'Norway', 'code' => 'NOR', 'phone_code' => '+47', 'currency_code' => 'NOK'],
            ['name' => 'Denmark', 'code' => 'DNK', 'phone_code' => '+45', 'currency_code' => 'DKK'],
            ['name' => 'Finland', 'code' => 'FIN', 'phone_code' => '+358', 'currency_code' => 'EUR'],
            ['name' => 'Poland', 'code' => 'POL', 'phone_code' => '+48', 'currency_code' => 'PLN'],
            ['name' => 'Portugal', 'code' => 'PRT', 'phone_code' => '+351', 'currency_code' => 'EUR'],
            ['name' => 'Greece', 'code' => 'GRC', 'phone_code' => '+30', 'currency_code' => 'EUR'],
            ['name' => 'Ireland', 'code' => 'IRL', 'phone_code' => '+353', 'currency_code' => 'EUR'],
            ['name' => 'Japan', 'code' => 'JPN', 'phone_code' => '+81', 'currency_code' => 'JPY'],
            ['name' => 'South Korea', 'code' => 'KOR', 'phone_code' => '+82', 'currency_code' => 'KRW'],
            ['name' => 'China', 'code' => 'CHN', 'phone_code' => '+86', 'currency_code' => 'CNY'],
            ['name' => 'India', 'code' => 'IND', 'phone_code' => '+91', 'currency_code' => 'INR'],
            ['name' => 'Singapore', 'code' => 'SGP', 'phone_code' => '+65', 'currency_code' => 'SGD'],
            ['name' => 'Malaysia', 'code' => 'MYS', 'phone_code' => '+60', 'currency_code' => 'MYR'],
            ['name' => 'Thailand', 'code' => 'THA', 'phone_code' => '+66', 'currency_code' => 'THB'],
            ['name' => 'United Arab Emirates', 'code' => 'ARE', 'phone_code' => '+971', 'currency_code' => 'AED'],
            ['name' => 'Saudi Arabia', 'code' => 'SAU', 'phone_code' => '+966', 'currency_code' => 'SAR'],
            ['name' => 'South Africa', 'code' => 'ZAF', 'phone_code' => '+27', 'currency_code' => 'ZAR'],
            ['name' => 'Brazil', 'code' => 'BRA', 'phone_code' => '+55', 'currency_code' => 'BRL'],
            ['name' => 'Mexico', 'code' => 'MEX', 'phone_code' => '+52', 'currency_code' => 'MXN'],
            ['name' => 'Argentina', 'code' => 'ARG', 'phone_code' => '+54', 'currency_code' => 'ARS'],
            ['name' => 'New Zealand', 'code' => 'NZL', 'phone_code' => '+64', 'currency_code' => 'NZD'],
        ];

        foreach ($countries as $country) {
            Country::updateOrCreate(
                ['code' => $country['code']],
                $country
            );
        }
    }
}
