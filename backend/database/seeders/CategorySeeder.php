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
        // Main Categories
        $frames = Category::firstOrCreate(
            ['slug' => 'frames'],
            [
                'name' => 'Frames',
                'description' => 'Eyeglass frames for all styles and preferences',
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        $sunglasses = Category::firstOrCreate(
            ['slug' => 'sunglasses'],
            [
                'name' => 'Sunglasses',
                'description' => 'Stylish sunglasses for UV protection',
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        $contactLenses = Category::firstOrCreate(
            ['slug' => 'contact-lenses'],
            [
                'name' => 'Contact Lenses',
                'description' => 'Comfortable contact lenses for clear vision',
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        $eyeHygiene = Category::firstOrCreate(
            ['slug' => 'eye-hygiene'],
            [
                'name' => 'Eye Hygiene',
                'description' => 'Eye care products and solutions',
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        $accessories = Category::firstOrCreate(
            ['slug' => 'accessories'],
            [
                'name' => 'Accessories',
                'description' => 'Eyewear accessories and care products',
                'sort_order' => 5,
                'is_active' => true,
            ]
        );

        // Sub-categories for Frames
        Category::firstOrCreate(
            ['slug' => 'round-frames'],
            [
                'name' => 'Round Frames',
                'description' => 'Classic round eyeglass frames',
                'parent_id' => $frames->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'square-frames'],
            [
                'name' => 'Square Frames',
                'description' => 'Modern square eyeglass frames',
                'parent_id' => $frames->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'cat-eye-frames'],
            [
                'name' => 'Cat-Eye Frames',
                'description' => 'Stylish cat-eye eyeglass frames',
                'parent_id' => $frames->id,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'aviator-frames'],
            [
                'name' => 'Aviator Frames',
                'description' => 'Classic aviator style frames',
                'parent_id' => $frames->id,
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        // Sub-categories for Sunglasses
        Category::firstOrCreate(
            ['slug' => 'aviator-sunglasses'],
            [
                'name' => 'Aviator Sunglasses',
                'description' => 'Classic aviator style sunglasses',
                'parent_id' => $sunglasses->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'wayfarer-sunglasses'],
            [
                'name' => 'Wayfarer Sunglasses',
                'description' => 'Timeless wayfarer style sunglasses',
                'parent_id' => $sunglasses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'sport-sunglasses'],
            [
                'name' => 'Sport Sunglasses',
                'description' => 'Performance sunglasses for sports',
                'parent_id' => $sunglasses->id,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        // Sub-categories for Contact Lenses
        Category::firstOrCreate(
            ['slug' => 'daily-disposable'],
            [
                'name' => 'Daily Disposable',
                'description' => 'Daily disposable contact lenses',
                'parent_id' => $contactLenses->id,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'monthly-lenses'],
            [
                'name' => 'Monthly Lenses',
                'description' => 'Monthly replacement contact lenses',
                'parent_id' => $contactLenses->id,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        Category::firstOrCreate(
            ['slug' => 'toric-lenses'],
            [
                'name' => 'Toric Lenses',
                'description' => 'Contact lenses for astigmatism',
                'parent_id' => $contactLenses->id,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );
    }
}

