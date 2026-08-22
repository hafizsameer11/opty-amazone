<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Eye Glasses
        $eyeGlasses = Category::updateOrCreate(
            ['slug' => 'eye-glasses'],
            [
                'name' => 'eye glasses',
                'name_it' => 'Occhiali da vista',
                'description' => null,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'men'],
            [
                'name' => 'men',
                'name_it' => 'Uomo',
                'description' => null,
                'parent_id' => $eyeGlasses->id,
                'sort_order' => 0,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'women'],
            [
                'name' => 'women',
                'name_it' => 'Donna',
                'description' => null,
                'parent_id' => $eyeGlasses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'kids-eye-glasses'],
            [
                'name' => 'kids',
                'name_it' => 'Bambini',
                'description' => null,
                'parent_id' => $eyeGlasses->id,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        // 2. Sun Glasses
        $sunGlasses = Category::updateOrCreate(
            ['slug' => 'sun-glasses'],
            [
                'name' => 'sun glasses',
                'name_it' => 'Occhiali da sole',
                'description' => null,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'men-glasses'],
            [
                'name' => 'men glasses',
                'name_it' => 'Uomo',
                'description' => null,
                'parent_id' => $sunGlasses->id,
                'sort_order' => 0,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'women-glasses'],
            [
                'name' => 'women glasses',
                'name_it' => 'Donna',
                'description' => null,
                'parent_id' => $sunGlasses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'kids-sun-glasses'],
            [
                'name' => 'kids',
                'name_it' => 'Bambini',
                'description' => null,
                'parent_id' => $sunGlasses->id,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        // 3. Opty Kids
        $optyKids = Category::updateOrCreate(
            ['slug' => 'opty-kids'],
            [
                'name' => 'Opty kids',
                'name_it' => 'Opty Kids',
                'description' => null,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'baby-girl'],
            [
                'name' => 'baby girl',
                'name_it' => 'Bambina',
                'description' => null,
                'parent_id' => $optyKids->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'baby-boy'],
            [
                'name' => 'baby boy',
                'name_it' => 'Bambino',
                'description' => null,
                'parent_id' => $optyKids->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        // 4. Contact Lenses
        $contactLenses = Category::updateOrCreate(
            ['slug' => 'contact-lenses'],
            [
                'name' => 'contact-lenses',
                'name_it' => 'Lenti a contatto',
                'description' => null,
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        $daily = Category::updateOrCreate(
            ['slug' => 'daily'],
            [
                'name' => 'Daily',
                'name_it' => 'Giornaliere',
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'spherical'],
            [
                'name' => 'Spherical',
                'name_it' => 'Sferiche',
                'description' => null,
                'parent_id' => $daily->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'astigmatism'],
            [
                'name' => 'Astigmatism',
                'name_it' => 'Astigmatismo',
                'description' => null,
                'parent_id' => $daily->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        $weakly = Category::updateOrCreate(
            ['slug' => 'weakly'],
            [
                'name' => 'Weakly',
                'name_it' => 'Settimanali',
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'spherical-weakly'],
            [
                'name' => 'Spherical',
                'name_it' => 'Sferiche',
                'description' => null,
                'parent_id' => $weakly->id,
                'sort_order' => 0,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'astigmatism-weakly'],
            [
                'name' => 'astigmatism',
                'name_it' => 'Astigmatismo',
                'description' => null,
                'parent_id' => $weakly->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        $monthly = Category::updateOrCreate(
            ['slug' => 'monthly'],
            [
                'name' => 'Monthly',
                'name_it' => 'Mensili',
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'spherical-monthly'],
            [
                'name' => 'Spherical',
                'name_it' => 'Sferiche',
                'description' => null,
                'parent_id' => $monthly->id,
                'sort_order' => 0,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'astigmatism-monthly'],
            [
                'name' => 'astigmatism',
                'name_it' => 'Astigmatismo',
                'description' => null,
                'parent_id' => $monthly->id,
                'sort_order' => 0,
                'is_active' => true,
            ]
        );

        Category::updateOrCreate(
            ['slug' => 'coloured-lenses'],
            [
                'name' => 'coloured lenses',
                'name_it' => 'Lenti colorate',
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        // 5. Eye Hygiene (+ children from Vistaexpress plan)
        $eyeHygiene = Category::updateOrCreate(
            ['slug' => 'eye-hygiene'],
            [
                'name' => 'Eye hygiene',
                'name_it' => 'Igiene oculare',
                'description' => null,
                'sort_order' => 5,
                'is_active' => true,
            ]
        );

        $this->seedEyeHygieneTree($eyeHygiene->id);

        // 6. Accessori
        Category::updateOrCreate(
            ['slug' => 'accessori'],
            [
                'name' => 'Accessori',
                'name_it' => 'Accessori',
                'description' => null,
                'sort_order' => 8,
                'is_active' => true,
            ]
        );
    }

    /**
     * @param  array<int, array{name: string, name_it: string, slug: string, children?: array<int, array{name: string, name_it: string, slug: string}>}>  $tree
     */
    private function seedEyeHygieneTree(int $parentId): void
    {
        $tree = [
            [
                'slug' => 'contact-lens-care',
                'name' => 'Contact Lens Care',
                'name_it' => 'Cura delle lenti a contatto',
                'children' => [
                    ['slug' => 'multi-purpose-solutions', 'name' => 'Multi-Purpose Solutions', 'name_it' => 'Soluzioni multiuso'],
                    ['slug' => 'saline-solutions', 'name' => 'Saline Solutions', 'name_it' => 'Soluzioni saline'],
                    ['slug' => 'hydrogen-peroxide-solutions', 'name' => 'Hydrogen Peroxide Solutions', 'name_it' => 'Soluzioni a perossido di idrogeno'],
                    ['slug' => 'protein-removers', 'name' => 'Protein Removers', 'name_it' => 'Rimuovi proteine'],
                    ['slug' => 'rewetting-drops', 'name' => 'Rewetting Drops', 'name_it' => 'Gocce riumidificanti'],
                    ['slug' => 'lens-cases', 'name' => 'Lens Cases', 'name_it' => 'Portalenti'],
                ],
            ],
            [
                'slug' => 'eye-drops',
                'name' => 'Eye Drops',
                'name_it' => 'Colliri',
                'children' => [
                    ['slug' => 'artificial-tears', 'name' => 'Artificial Tears', 'name_it' => 'Lacrime artificiali'],
                    ['slug' => 'dry-eye-relief', 'name' => 'Dry Eye Relief', 'name_it' => 'Sollievo occhio secco'],
                    ['slug' => 'allergy-relief', 'name' => 'Allergy Relief', 'name_it' => 'Sollievo allergie'],
                    ['slug' => 'contact-lens-drops', 'name' => 'Contact Lens Drops', 'name_it' => 'Gocce per lenti a contatto'],
                    ['slug' => 'preservative-free-drops', 'name' => 'Preservative-Free Drops', 'name_it' => 'Gocce senza conservanti'],
                ],
            ],
            [
                'slug' => 'eyelid-care',
                'name' => 'Eyelid Care',
                'name_it' => 'Cura delle palpebre',
                'children' => [
                    ['slug' => 'eyelid-wipes', 'name' => 'Eyelid Wipes', 'name_it' => 'Salviette per palpebre'],
                    ['slug' => 'eyelid-cleansers', 'name' => 'Eyelid Cleansers', 'name_it' => 'Detergenti per palpebre'],
                    ['slug' => 'cleansing-foam', 'name' => 'Cleansing Foam', 'name_it' => 'Schiuma detergente'],
                    ['slug' => 'eyelid-sprays', 'name' => 'Eyelid Sprays', 'name_it' => 'Spray per palpebre'],
                ],
            ],
            [
                'slug' => 'lens-cleaning',
                'name' => 'Lens Cleaning',
                'name_it' => 'Pulizia lenti',
                'children' => [
                    ['slug' => 'cleaning-sprays', 'name' => 'Cleaning Sprays', 'name_it' => 'Spray detergenti'],
                    ['slug' => 'cleaning-wipes', 'name' => 'Cleaning Wipes', 'name_it' => 'Salviette detergenti'],
                    ['slug' => 'microfiber-cloths', 'name' => 'Microfiber Cloths', 'name_it' => 'Panni in microfibra'],
                    ['slug' => 'anti-fog-sprays', 'name' => 'Anti-Fog Sprays', 'name_it' => 'Spray antiappannamento'],
                ],
            ],
            [
                'slug' => 'eye-masks-compresses',
                'name' => 'Eye Masks & Compresses',
                'name_it' => 'Maschere e compresse oculari',
                'children' => [
                    ['slug' => 'warm-eye-masks', 'name' => 'Warm Eye Masks', 'name_it' => 'Maschere calde'],
                    ['slug' => 'cold-eye-masks', 'name' => 'Cold Eye Masks', 'name_it' => 'Maschere fredde'],
                    ['slug' => 'gel-eye-masks', 'name' => 'Gel Eye Masks', 'name_it' => 'Maschere in gel'],
                    ['slug' => 'reusable-compresses', 'name' => 'Reusable Compresses', 'name_it' => 'Compresse riutilizzabili'],
                ],
            ],
            [
                'slug' => 'eye-supplements',
                'name' => 'Eye Supplements',
                'name_it' => 'Integratori per gli occhi',
                'children' => [
                    ['slug' => 'lutein-supplements', 'name' => 'Lutein Supplements', 'name_it' => 'Integratori di luteina'],
                    ['slug' => 'omega-3', 'name' => 'Omega-3', 'name_it' => 'Omega-3'],
                    ['slug' => 'eye-vitamins', 'name' => 'Eye Vitamins', 'name_it' => 'Vitamine per gli occhi'],
                    ['slug' => 'zeaxanthin-supplements', 'name' => 'Zeaxanthin Supplements', 'name_it' => 'Integratori di zeaxantina'],
                ],
            ],
        ];

        foreach ($tree as $sort => $node) {
            $parent = Category::updateOrCreate(
                ['slug' => $node['slug']],
                [
                    'name' => $node['name'],
                    'name_it' => $node['name_it'],
                    'description' => null,
                    'parent_id' => $parentId,
                    'sort_order' => $sort + 1,
                    'is_active' => true,
                ]
            );

            foreach ($node['children'] as $childSort => $child) {
                Category::updateOrCreate(
                    ['slug' => $child['slug']],
                    [
                        'name' => $child['name'],
                        'name_it' => $child['name_it'],
                        'description' => null,
                        'parent_id' => $parent->id,
                        'sort_order' => $childSort + 1,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
