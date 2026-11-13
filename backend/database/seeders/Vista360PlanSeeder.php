<?php

namespace Database\Seeders;

use App\Models\Vista360Plan;
use Illuminate\Database\Seeder;

/**
 * Initial, fully editable product catalogue for the Vista Express 360 CRM.
 * Amounts, labels, benefits and actual access keys live in the database and
 * can all be changed by a platform administrator without deploying code.
 */
class Vista360PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Go',
                'slug' => 'go',
                'description' => 'A focused digital workspace for one optical shop.',
                'sort_order' => 10,
                'prices' => [1 => 1900, 6 => 10200, 12 => 18200],
                'features' => [
                    ['key' => 'crm.access', 'title' => 'Vista Express 360 access'],
                    ['key' => 'crm.customers', 'title' => 'Customer management'],
                    ['key' => 'crm.products', 'title' => 'Product catalogue'],
                    ['key' => 'crm.stock', 'title' => 'Stock and inventory'],
                    ['key' => 'crm.orders', 'title' => 'Orders and internal sales'],
                    ['key' => 'crm.agenda', 'title' => 'Agenda and appointments'],
                    ['key' => 'crm.vista_publish', 'title' => 'Publish products to Vista Express'],
                ],
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'description' => 'Operations, optical care and customer engagement for growing shops.',
                'sort_order' => 20,
                'prices' => [1 => 3900, 6 => 21060, 12 => 37440],
                'features' => [
                    ['key' => 'crm.access', 'title' => 'Vista Express 360 access'],
                    ['key' => 'crm.customers', 'title' => 'Customer management'],
                    ['key' => 'crm.products', 'title' => 'Product catalogue'],
                    ['key' => 'crm.stock', 'title' => 'Stock and inventory'],
                    ['key' => 'crm.orders', 'title' => 'Orders and internal sales'],
                    ['key' => 'crm.agenda', 'title' => 'Agenda and appointments'],
                    ['key' => 'crm.optical', 'title' => 'Optical care and examinations'],
                    ['key' => 'crm.documents', 'title' => 'Customer documents'],
                    ['key' => 'crm.reminders', 'title' => 'Business reminders and follow-ups'],
                    ['key' => 'crm.communications', 'title' => 'Customer communications'],
                    ['key' => 'crm.reports', 'title' => 'Reports and dashboards'],
                    ['key' => 'crm.vista_publish', 'title' => 'Publish products to Vista Express'],
                ],
            ],
            [
                'name' => 'Pro Plus',
                'slug' => 'pro-plus',
                'description' => 'The full connected business workspace with team access and advanced controls.',
                'sort_order' => 30,
                'prices' => [1 => 6900, 6 => 37260, 12 => 66240],
                'features' => [
                    ['key' => 'crm.access', 'title' => 'Vista Express 360 access'],
                    ['key' => 'crm.customers', 'title' => 'Customer management'],
                    ['key' => 'crm.products', 'title' => 'Product catalogue'],
                    ['key' => 'crm.stock', 'title' => 'Stock and inventory'],
                    ['key' => 'crm.orders', 'title' => 'Orders and internal sales'],
                    ['key' => 'crm.agenda', 'title' => 'Agenda and appointments'],
                    ['key' => 'crm.optical', 'title' => 'Optical care and examinations'],
                    ['key' => 'crm.documents', 'title' => 'Customer documents'],
                    ['key' => 'crm.reminders', 'title' => 'Business reminders and follow-ups'],
                    ['key' => 'crm.communications', 'title' => 'Customer communications'],
                    ['key' => 'crm.reports', 'title' => 'Reports and dashboards'],
                    ['key' => 'crm.team', 'title' => 'Employee accounts and permissions'],
                    ['key' => 'crm.vista_publish', 'title' => 'Publish products to Vista Express'],
                    ['key' => 'crm.integrations', 'title' => 'Connected integrations'],
                ],
            ],
        ];

        foreach ($plans as $planData) {
            $plan = Vista360Plan::updateOrCreate(
                ['slug' => $planData['slug']],
                [
                    'name' => $planData['name'],
                    'description' => $planData['description'],
                    'is_active' => true,
                    'sort_order' => $planData['sort_order'],
                    'display_details' => ['currency' => 'EUR'],
                ]
            );

            foreach ($planData['prices'] as $months => $amount) {
                $plan->prices()->firstOrCreate(
                    ['duration_months' => $months, 'version' => 1],
                    ['amount_cents' => $amount, 'currency' => 'EUR', 'is_active' => true]
                );
            }
            foreach ($planData['features'] as $index => $feature) {
                $plan->features()->updateOrCreate(
                    ['feature_key' => $feature['key']],
                    [
                        'title' => $feature['title'],
                        'description' => null,
                        'is_active' => true,
                        'sort_order' => $index + 1,
                    ]
                );
            }
        }
    }
}
