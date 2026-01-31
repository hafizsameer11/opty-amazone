<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\User;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class StoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all sellers
        $sellers = User::where('role', 'seller')->get();
        $subscriptionPlans = SubscriptionPlan::all();

        if ($sellers->isEmpty()) {
            $this->command->warn('No sellers found. Please run UserSeeder first.');
            return;
        }

        // Create store for test seller
        $testSeller = User::where('email', 'seller@test.com')->first();
        if ($testSeller) {
            $store = Store::firstOrCreate(
                ['slug' => 'visionpro-optics'],
                [
                    'user_id' => $testSeller->id,
                    'name' => 'VisionPro Optics',
                    'description' => 'Your trusted source for premium eyewear. We offer a wide selection of frames, sunglasses, and contact lenses from top brands. Our expert team is here to help you find the perfect pair.',
                    'email' => 'contact@visionpro.com',
                    'phone' => '+1-555-0100',
                    'profile_image' => null,
                    'banner_image' => null,
                    'theme_color' => '#0066CC',
                    'phone_visibility' => 'public',
                    'status' => 'active',
                    'is_active' => true,
                    'onboarding_status' => 'approved',
                    'onboarding_level' => 5,
                    'onboarding_percent' => 100,
                    'meta' => [
                        'established' => '2015',
                        'specialties' => ['Premium Frames', 'Designer Sunglasses', 'Contact Lenses'],
                    ],
                ]
            );

            // Create subscription for test store
            if ($subscriptionPlans->isNotEmpty()) {
                $professionalPlan = $subscriptionPlans->where('slug', 'professional-plan')->first()
                    ?? $subscriptionPlans->first();

                Subscription::firstOrCreate(
                    ['store_id' => $store->id],
                    [
                        'subscription_plan_id' => $professionalPlan->id,
                        'status' => 'active',
                        'start_date' => now()->subMonths(2),
                        'end_date' => now()->addMonths(10),
                    ]
                );
            }

            // Create store statistics
            if (!$store->statistics) {
                $store->statistics()->create([
                'total_views' => 12500,
                'total_clicks' => 3200,
                'total_orders' => 145,
                'total_revenue' => 45000.00,
                'total_products' => 0, // Will be updated by ProductSeeder
                'total_followers' => 89,
                'total_reviews' => 67,
                'average_rating' => 4.6,
                'last_calculated_at' => now(),
                ]);
            }
        }

        // Create stores for other sellers
        $otherSellers = $sellers->where('email', '!=', 'seller@test.com');

        foreach ($otherSellers as $seller) {
            $storeNames = [
                'Elite Eyewear',
                'Modern Vision',
                'Clear Sight Optics',
                'Premium Frames Co.',
                'Designer Glasses Hub',
            ];

            $storeName = fake()->randomElement($storeNames);
            $store = Store::create([
                'user_id' => $seller->id,
                'name' => $storeName,
                'slug' => Str::slug($storeName) . '-' . fake()->unique()->numberBetween(100, 999),
                'description' => fake()->paragraph(3),
                'email' => fake()->companyEmail(),
                'phone' => fake()->phoneNumber(),
                'profile_image' => null,
                'banner_image' => null,
                'theme_color' => fake()->hexColor(),
                'phone_visibility' => fake()->randomElement(['public', 'request', 'hidden']),
                'status' => fake()->randomElement(['active', 'pending']),
                'is_active' => true,
                'onboarding_status' => fake()->randomElement(['approved', 'pending', 'in_progress']),
                'onboarding_level' => fake()->numberBetween(1, 5),
                'onboarding_percent' => fake()->numberBetween(20, 100),
                'meta' => null,
            ]);

            // Create subscription for some stores
            if (fake()->boolean(70) && $subscriptionPlans->isNotEmpty()) {
                $plan = fake()->randomElement($subscriptionPlans->all());
                Subscription::firstOrCreate(
                    ['store_id' => $store->id],
                    [
                        'subscription_plan_id' => $plan->id,
                        'status' => 'active',
                        'start_date' => now()->subMonths(fake()->numberBetween(1, 6)),
                        'end_date' => now()->addMonths(fake()->numberBetween(6, 12)),
                    ]
                );
            }

            // Create store statistics
            if (!$store->statistics) {
                $store->statistics()->create([
                'total_views' => fake()->numberBetween(100, 5000),
                'total_clicks' => fake()->numberBetween(50, 2000),
                'total_orders' => fake()->numberBetween(0, 100),
                'total_revenue' => fake()->randomFloat(2, 0, 20000),
                'total_products' => 0,
                'total_followers' => fake()->numberBetween(0, 50),
                'total_reviews' => fake()->numberBetween(0, 30),
                'average_rating' => fake()->randomFloat(2, 3.5, 5.0),
                'last_calculated_at' => now(),
                ]);
            }
        }
    }
}

