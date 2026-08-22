<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Production-safe: creates the admin user if missing only (firstOrCreate).
 * Does not overwrite an existing row — safe to run on live data.
 *
 * Run on production (no wipe):
 *   php artisan db:seed --class=Database\\Seeders\\AdminSeeder --force
 *
 * Optional .env (recommended for production bootstrap):
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE
 * If unset, defaults match local dev (see below).
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@optyamazone.com');
        $plainPassword = env('ADMIN_PASSWORD', 'password');

        User::firstOrCreate(
            ['email' => $email],
            [
                'name' => env('ADMIN_NAME', 'Admin User'),
                'phone' => env('ADMIN_PHONE', '+1234567890'),
                'role' => 'admin',
                'is_blocked' => false,
                'email_verified_at' => now(),
                'password' => Hash::make($plainPassword),
            ]
        );
    }
}
