<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed geographic data first
        $this->call([
            CountrySeeder::class,
            StateSeeder::class,
            CitySeeder::class,
        ]);

        // Seed categories
        $this->call([
            CategorySeeder::class,
        ]);

        // Seed subscription plans
        $this->call([
            SubscriptionPlanSeeder::class,
        ]);

        // Seed users (buyers and sellers)
        $this->call([
            UserSeeder::class,
        ]);

        // Seed stores (requires users)
        $this->call([
            StoreSeeder::class,
        ]);

        // Seed products (requires stores and categories)
        $this->call([
            ProductSeeder::class,
        ]);

        $this->command->info('Database seeded successfully!');
        $this->command->info('Test credentials:');
        $this->command->info('  Admin: admin@optyamazone.com / password');
        $this->command->info('  Buyer: buyer@test.com / password');
        $this->command->info('  Seller: seller@test.com / password');
    }
}
