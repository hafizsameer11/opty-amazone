<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Admin User
        User::firstOrCreate(
            ['email' => 'admin@optyamazone.com'],
            [
                'name' => 'Admin User',
                'phone' => '+1234567890',
                'role' => 'admin',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ]
        );

        // Create Test Buyer
        User::firstOrCreate(
            ['email' => 'buyer@test.com'],
            [
                'name' => 'John Buyer',
                'phone' => '+1234567891',
                'role' => 'buyer',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ]
        );

        // Create Test Seller
        User::firstOrCreate(
            ['email' => 'seller@test.com'],
            [
                'name' => 'Sarah Seller',
                'phone' => '+1234567892',
                'role' => 'seller',
                'email_verified_at' => now(),
                'password' => Hash::make('password'),
            ]
        );

        // Create additional buyers
        User::factory(10)->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        // Create additional sellers
        User::factory(5)->seller()->create([
            'email_verified_at' => now(),
        ]);
    }
}

