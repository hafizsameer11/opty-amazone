<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        SubscriptionPlan::firstOrCreate(
            ['slug' => 'basic-plan'],
            [
                'name' => 'Basic Plan',
                'description' => 'Perfect for small stores just getting started',
                'price' => 9.99,
                'billing_period' => 'monthly',
                'max_products' => 50,
                'max_banners' => 2,
                'promotion_budget_limit' => 100.00,
                'has_analytics' => false,
                'has_priority_support' => false,
                'features' => [
                    'Up to 50 products',
                    '2 store banners',
                    'Basic analytics',
                    'Email support',
                ],
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        SubscriptionPlan::firstOrCreate(
            ['slug' => 'professional-plan'],
            [
                'name' => 'Professional Plan',
                'description' => 'Ideal for growing businesses',
                'price' => 29.99,
                'billing_period' => 'monthly',
                'max_products' => 200,
                'max_banners' => 5,
                'promotion_budget_limit' => 500.00,
                'has_analytics' => true,
                'has_priority_support' => false,
                'features' => [
                    'Up to 200 products',
                    '5 store banners',
                    'Advanced analytics',
                    'Priority email support',
                    'Product promotions',
                ],
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        SubscriptionPlan::firstOrCreate(
            ['slug' => 'enterprise-plan'],
            [
                'name' => 'Enterprise Plan',
                'description' => 'For established businesses with high volume',
                'price' => 99.99,
                'billing_period' => 'monthly',
                'max_products' => null, // Unlimited
                'max_banners' => 10,
                'promotion_budget_limit' => null, // Unlimited
                'has_analytics' => true,
                'has_priority_support' => true,
                'features' => [
                    'Unlimited products',
                    '10 store banners',
                    'Advanced analytics',
                    '24/7 priority support',
                    'Unlimited promotions',
                    'Custom integrations',
                ],
                'is_active' => true,
                'sort_order' => 3,
            ]
        );
    }
}

