<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class AddLensColorsToProductsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Common lens colors for glasses
        $lensColors = [
            [
                'id' => 1,
                'name' => 'Clear',
                'color_code' => '#FFFFFF',
                'description' => 'Transparent clear lenses',
            ],
            [
                'id' => 2,
                'name' => 'Blue',
                'color_code' => '#4A90E2',
                'description' => 'Blue tinted lenses',
            ],
            [
                'id' => 3,
                'name' => 'Green',
                'color_code' => '#50C878',
                'description' => 'Green tinted lenses',
            ],
            [
                'id' => 4,
                'name' => 'Brown',
                'color_code' => '#8B4513',
                'description' => 'Brown tinted lenses',
            ],
            [
                'id' => 5,
                'name' => 'Gray',
                'color_code' => '#808080',
                'description' => 'Gray tinted lenses',
            ],
            [
                'id' => 6,
                'name' => 'Rose',
                'color_code' => '#FF69B4',
                'description' => 'Rose tinted lenses',
            ],
            [
                'id' => 7,
                'name' => 'Yellow',
                'color_code' => '#FFD700',
                'description' => 'Yellow tinted lenses for enhanced contrast',
            ],
            [
                'id' => 8,
                'name' => 'Mirror',
                'color_code' => '#C0C0C0',
                'description' => 'Mirror finish lenses',
            ],
        ];

        // Get all frame and sunglasses products
        $products = Product::whereIn('product_type', ['frame', 'sunglasses'])
            ->where('is_active', true)
            ->get();

        $this->command->info("Found {$products->count()} products to update with lens colors.");

        $updated = 0;
        foreach ($products as $product) {
            // Skip if already has lens_colors
            if ($product->lens_colors && count($product->lens_colors) > 0) {
                continue;
            }

            // For sunglasses, use darker/mirror colors
            // For frames, use all colors
            $colorsToAdd = $product->product_type === 'sunglasses'
                ? array_slice($lensColors, 0, 6) // First 6 colors (excluding yellow and mirror for most)
                : $lensColors; // All colors for frames

            // Randomly select 4-6 colors for variety
            $selectedColors = fake()->randomElements($colorsToAdd, fake()->numberBetween(4, min(6, count($colorsToAdd))));

            $product->lens_colors = $selectedColors;
            $product->save();

            $updated++;
        }

        $this->command->info("Successfully added lens colors to {$updated} products.");
        $this->command->info("Lens colors added:");
        foreach ($lensColors as $color) {
            $this->command->info("  - {$color['name']} ({$color['color_code']})");
        }
    }
}

