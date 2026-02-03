<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Main Categories - Based on original structure shared by user
        
        // 1. Eye Glasses (id: 23)
        $eyeGlasses = Category::updateOrCreate(
            ['slug' => 'eye-glasses'],
            [
                'name' => 'eye glasses',
                'description' => null,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        // Subcategories for Eye Glasses
        Category::updateOrCreate(
            ['slug' => 'men'],
            [
                'name' => 'men',
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
                'description' => null,
                'parent_id' => $eyeGlasses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        // 2. Sun Glasses (id: 28)
        $sunGlasses = Category::updateOrCreate(
            ['slug' => 'sun-glasses'],
            [
                'name' => 'sun glasses',
                'description' => null,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        // Subcategories for Sun Glasses
        Category::updateOrCreate(
            ['slug' => 'men-glasses'],
            [
                'name' => 'men glasses',
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
                'description' => null,
                'parent_id' => $sunGlasses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        // 3. Opty Kids (id: 29)
        $optyKids = Category::updateOrCreate(
            ['slug' => 'opty-kids'],
            [
                'name' => 'Opty kids',
                'description' => null,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        // Subcategories for Opty Kids
        Category::updateOrCreate(
            ['slug' => 'baby-girl'],
            [
                'name' => 'baby girl',
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
                'description' => null,
                'parent_id' => $optyKids->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        // 4. Contact Lenses (id: 24)
        $contactLenses = Category::updateOrCreate(
            ['slug' => 'contact-lenses'],
            [
                'name' => 'contact-lenses',
                'description' => null,
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        // Subcategories for Contact Lenses
        $daily = Category::updateOrCreate(
            ['slug' => 'daily'],
            [
                'name' => 'Daily',
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        // Sub-subcategories for Daily
        Category::updateOrCreate(
            ['slug' => 'spherical'],
            [
                'name' => 'Spherical',
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
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        // Sub-subcategories for Weakly
        Category::updateOrCreate(
            ['slug' => 'spherical-weakly'],
            [
                'name' => 'Spherical',
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
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        // Sub-subcategories for Monthly
        Category::updateOrCreate(
            ['slug' => 'spherical-monthly'],
            [
                'name' => 'Spherical',
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
                'description' => null,
                'parent_id' => $contactLenses->id,
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        // 5. Eye Hygiene (id: 30)
        Category::updateOrCreate(
            ['slug' => 'eye-hygiene'],
            [
                'name' => 'Eye hygiene',
                'description' => null,
                'sort_order' => 5,
                'is_active' => true,
            ]
        );

        // 6. Accessori (id: 36)
        Category::updateOrCreate(
            ['slug' => 'accessori'],
            [
                'name' => 'Accessori',
                'description' => null,
                'sort_order' => 8,
                'is_active' => true,
            ]
        );
    }
}
