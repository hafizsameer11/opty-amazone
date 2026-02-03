<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;

class ProductVariantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Eye product category IDs: 23 (eye glasses), 28 (sun glasses), 29 (opty kids)
        // Also check by category slug in case IDs are different
        $eyeCategorySlugs = ['eye-glasses', 'sun-glasses', 'opty-kids'];
        
        // Get categories by slug first
        $eyeCategories = \App\Models\Category::whereIn('slug', $eyeCategorySlugs)
            ->orWhereIn('id', [23, 28, 29])
            ->pluck('id')
            ->toArray();
        
        // If no categories found by slug/ID, try to find any products with frame or sunglasses type
        if (empty($eyeCategories)) {
            $this->command->warn('Eye categories not found. Trying to find frame/sunglasses products by type...');
            $eyeProducts = Product::whereIn('product_type', ['frame', 'sunglasses'])
                ->where('is_active', true)
                ->get();
        } else {
            // Get all products in eye product categories
            $eyeProducts = Product::whereIn('category_id', $eyeCategories)
                ->where('is_active', true)
                ->get();
        }

        if ($eyeProducts->isEmpty()) {
            $this->command->warn('No eye products found. Please ensure products exist with category_id 23, 28, or 29, or product_type "frame"/"sunglasses".');
            $this->command->info('You can check existing categories with: php artisan tinker -> Category::all()');
            return;
        }

        $this->command->info("Found {$eyeProducts->count()} eye products. Adding color variations...");

        $colorOptions = [
            ['name' => 'Black', 'code' => '#000000'],
            ['name' => 'Brown', 'code' => '#8B4513'],
            ['name' => 'Tortoise', 'code' => '#8B4513'],
            ['name' => 'Blue', 'code' => '#0066CC'],
            ['name' => 'Red', 'code' => '#DC143C'],
            ['name' => 'Gold', 'code' => '#FFD700'],
            ['name' => 'Silver', 'code' => '#C0C0C0'],
            ['name' => 'Gunmetal', 'code' => '#2C3539'],
            ['name' => 'Rose Gold', 'code' => '#E8B4B8'],
            ['name' => 'Crystal', 'code' => '#F0F8FF'],
        ];

        $imageIds = [
            '1511497584788-876760111969',
            '1574258495973-f340df3d44cf',
            '1512106378517-16c2f2d81b56',
            '1572635196237-14b3f281503f',
            '1511497584788-876760111969',
            '1574258495973-f340df3d44cf',
        ];

        $variantsCreated = 0;

        foreach ($eyeProducts as $index => $product) {
            // Skip if product already has variants
            if ($product->variants()->count() > 0) {
                continue;
            }

            // Select 2-4 random colors for each product
            $selectedColors = fake()->randomElements($colorOptions, fake()->numberBetween(2, 4));
            $isFirst = true;

            foreach ($selectedColors as $colorIndex => $color) {
                // Generate variant images (different from product images)
                $variantImageCount = fake()->numberBetween(1, 3);
                $variantImages = [];
                for ($i = 0; $i < $variantImageCount; $i++) {
                    $imageId = fake()->randomElement($imageIds);
                    $variantImages[] = "https://images.unsplash.com/photo-{$imageId}?auto=format&fit=crop&w=800&q=80&color={$color['code']}";
                }

                // Variant price can be same or slightly different from product price
                $variantPrice = fake()->boolean(30) 
                    ? $product->price + fake()->randomFloat(2, -10, 20)
                    : null;

                // Variant stock (distribute product stock across variants)
                $variantStock = fake()->numberBetween(5, 50);
                $stockStatus = $variantStock > 0 
                    ? fake()->randomElement(['in_stock', 'in_stock', 'in_stock', 'backorder'])
                    : 'out_of_stock';

                ProductVariant::create([
                    'product_id' => $product->id,
                    'color_name' => $color['name'],
                    'color_code' => $color['code'],
                    'images' => $variantImages,
                    'price' => $variantPrice,
                    'stock_quantity' => $variantStock,
                    'stock_status' => $stockStatus,
                    'is_default' => $isFirst, // First variant is default
                    'sort_order' => $colorIndex,
                ]);

                $isFirst = false;
                $variantsCreated++;
            }

            // Show progress
            if (($index + 1) % 10 === 0) {
                $this->command->info("Processed " . ($index + 1) . " products...");
            }
        }

        $this->command->info("✓ Created {$variantsCreated} color variations for eye products!");
    }
}

