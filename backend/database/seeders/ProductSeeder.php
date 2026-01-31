<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Store;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stores = Store::where('status', 'active')->get();
        $categories = Category::whereNull('parent_id')->get();
        $subCategories = Category::whereNotNull('parent_id')->get();

        if ($stores->isEmpty()) {
            $this->command->warn('No active stores found. Please run StoreSeeder first.');
            return;
        }

        // Get the test store (VisionPro Optics)
        $testStore = Store::where('slug', 'visionpro-optics')->first();

        if ($testStore) {
            $this->createProductsForStore($testStore, $categories, $subCategories, 30);
        }

        // Create products for other stores
        foreach ($stores->where('slug', '!=', 'visionpro-optics') as $store) {
            $productCount = fake()->numberBetween(5, 20);
            $this->createProductsForStore($store, $categories, $subCategories, $productCount);
        }

        // Update store statistics with product counts
        foreach ($stores as $store) {
            $productCount = Product::where('store_id', $store->id)->count();
            $store->statistics()->update(['total_products' => $productCount]);
        }
    }

    /**
     * Create products for a specific store.
     */
    private function createProductsForStore(
        Store $store,
        $categories,
        $subCategories,
        int $count
    ): void {
        $productTypes = [
            'frame' => ['Round Frames', 'Square Frames', 'Cat-Eye Frames', 'Aviator Frames'],
            'sunglasses' => ['Aviator Sunglasses', 'Wayfarer Sunglasses', 'Sport Sunglasses'],
            'contact_lens' => ['Daily Disposable', 'Monthly Lenses', 'Toric Lenses'],
            'eye_hygiene' => ['Eye Drops', 'Lens Solution', 'Cleaning Wipes'],
            'accessory' => ['Cases', 'Cleaning Cloths', 'Chains'],
        ];

        for ($i = 0; $i < $count; $i++) {
            $productType = fake()->randomElement(['frame', 'sunglasses', 'contact_lens', 'eye_hygiene', 'accessory']);
            
            // Get appropriate category
            $category = $categories->where('slug', $this->getCategorySlugForType($productType))->first()
                ?? $categories->random();
            
            // Get subcategory if available
            $categorySubCategories = $subCategories->where('parent_id', $category->id);
            $subCategory = $categorySubCategories->isNotEmpty() 
                ? $categorySubCategories->random() 
                : null;

            $name = $this->generateProductName($productType);
            $price = $this->getPriceForType($productType);
            $compareAtPrice = fake()->boolean(30) ? $price + fake()->randomFloat(2, 20, 100) : null;

            $product = Product::create([
                'store_id' => $store->id,
                'category_id' => $category->id,
                'sub_category_id' => $subCategory?->id,
                'name' => $name,
                'slug' => Str::slug($name) . '-' . fake()->unique()->numberBetween(10000, 99999),
                'sku' => 'SKU-' . strtoupper(Str::random(3)) . '-' . fake()->numberBetween(1000, 9999),
                'description' => $this->generateDescription($productType, $name),
                'short_description' => fake()->sentence(),
                'product_type' => $productType,
                'price' => $price,
                'compare_at_price' => $compareAtPrice,
                'cost_price' => $price * 0.6,
                'stock_quantity' => fake()->numberBetween(10, 200),
                'stock_status' => fake()->randomElement(['in_stock', 'in_stock', 'in_stock', 'out_of_stock']), // Mostly in stock
                'images' => $this->generateImages(),
                'frame_shape' => in_array($productType, ['frame', 'sunglasses'])
                    ? fake()->randomElement(['round', 'square', 'oval', 'cat-eye', 'aviator', 'rectangular', 'browline'])
                    : null,
                'frame_material' => in_array($productType, ['frame', 'sunglasses'])
                    ? fake()->randomElement(['acetate', 'metal', 'titanium', 'plastic', 'wood'])
                    : null,
                'frame_color' => in_array($productType, ['frame', 'sunglasses'])
                    ? fake()->randomElement(['Black', 'Brown', 'Tortoise', 'Blue', 'Red', 'Gold', 'Silver', 'Gunmetal'])
                    : null,
                'gender' => fake()->randomElement(['men', 'women', 'unisex', 'kids']),
                'lens_type' => $productType === 'frame'
                    ? fake()->randomElement(['single_vision', 'progressive', 'bifocal'])
                    : null,
                'lens_index_options' => $productType === 'frame'
                    ? json_encode(['1.50', '1.56', '1.61', '1.67'])
                    : null,
                'treatment_options' => $productType === 'frame'
                    ? json_encode(['anti_glare', 'blue_light', 'uv_protection', 'photochromic'])
                    : null,
                'rating' => fake()->randomFloat(2, 3.8, 5.0),
                'review_count' => fake()->numberBetween(5, 300),
                'view_count' => fake()->numberBetween(50, 3000),
                'is_featured' => fake()->boolean(15),
                'is_active' => true,
                'meta_title' => $name . ' - Premium Optical Products',
                'meta_description' => fake()->sentence(),
                'meta_keywords' => implode(', ', fake()->words(5)),
            ]);
        }
    }

    /**
     * Get category slug for product type.
     */
    private function getCategorySlugForType(string $type): string
    {
        return match($type) {
            'frame' => 'frames',
            'sunglasses' => 'sunglasses',
            'contact_lens' => 'contact-lenses',
            'eye_hygiene' => 'eye-hygiene',
            'accessory' => 'accessories',
            default => 'frames',
        };
    }

    /**
     * Generate product name based on type.
     */
    private function generateProductName(string $type): string
    {
        $names = [
            'frame' => [
                'Classic Round Frame Glasses',
                'Modern Square Frame Glasses',
                'Designer Cat-Eye Frames',
                'Premium Aviator Frames',
                'Vintage Browline Glasses',
                'Sleek Rectangular Frames',
                'Comfort Fit Round Frames',
                'Fashion Forward Square Frames',
                'Professional Oval Frames',
                'Trendy Geometric Frames',
            ],
            'sunglasses' => [
                'Classic Aviator Sunglasses',
                'Retro Round Sunglasses',
                'Oversized Cat-Eye Sunglasses',
                'Sport Polarized Sunglasses',
                'Designer Square Sunglasses',
                'Vintage Browline Sunglasses',
                'Luxury Wayfarer Sunglasses',
                'Modern Shield Sunglasses',
                'Pilot Style Sunglasses',
                'Fashion Square Sunglasses',
            ],
            'contact_lens' => [
                'Daily Disposable Contact Lenses',
                'Monthly Contact Lenses',
                'Toric Contact Lenses',
                'Multifocal Contact Lenses',
                'Colored Contact Lenses',
                'Astigmatism Contact Lenses',
                'Extended Wear Contact Lenses',
            ],
            'eye_hygiene' => [
                'Eye Drops Solution',
                'Contact Lens Solution',
                'Lens Cleaning Wipes',
                'Eye Care Kit',
                'Tear Drops',
                'Lens Case',
            ],
            'accessory' => [
                'Premium Eyeglass Case',
                'Microfiber Cleaning Cloth',
                'Eyeglass Chain',
                'Nose Pads Set',
                'Temple Tips',
                'Lens Cleaning Spray',
            ],
        ];

        return fake()->randomElement($names[$type] ?? ['Optical Product']);
    }

    /**
     * Get price range for product type.
     */
    private function getPriceForType(string $type): float
    {
        return match($type) {
            'frame' => fake()->randomFloat(2, 49.99, 299.99),
            'sunglasses' => fake()->randomFloat(2, 39.99, 249.99),
            'contact_lens' => fake()->randomFloat(2, 19.99, 149.99),
            'eye_hygiene' => fake()->randomFloat(2, 9.99, 49.99),
            'accessory' => fake()->randomFloat(2, 4.99, 29.99),
            default => fake()->randomFloat(2, 19.99, 99.99),
        };
    }

    /**
     * Generate product description.
     */
    private function generateDescription(string $type, string $name): string
    {
        $descriptions = [
            'frame' => "These premium {$name} combine timeless elegance with modern comfort. Crafted from high-quality materials, these frames offer durability and a lightweight feel. Perfect for everyday wear, these frames feature a comfortable fit and stylish design that complements various face shapes.",
            'sunglasses' => "Protect your eyes in style with these {$name}. Featuring UV protection and polarized lenses, these sunglasses offer both fashion and function. The durable frame construction ensures long-lasting wear while maintaining a comfortable fit.",
            'contact_lens' => "Experience clear, comfortable vision with these {$name}. Made with advanced materials for breathability and moisture retention, these lenses provide all-day comfort. Perfect for those seeking an alternative to traditional eyeglasses.",
            'eye_hygiene' => "Maintain optimal eye health with this {$name}. Formulated with gentle, effective ingredients, this product helps keep your eyes and contact lenses clean and comfortable. Essential for daily eye care routine.",
            'accessory' => "Protect and maintain your eyewear with this {$name}. Made from quality materials, this accessory helps extend the life of your glasses while keeping them clean and secure.",
        ];

        return $descriptions[$type] ?? fake()->paragraph(3);
    }

    /**
     * Generate product images.
     */
    private function generateImages(): array
    {
        $imageCount = fake()->numberBetween(1, 4);
        $images = [];
        
        // Use placeholder images or Unsplash
        $imageIds = [
            '1511497584788-876760111969',
            '1574258495973-f340df3d44cf',
            '1512106378517-16c2f2d81b56',
            '1572635196237-14b3f281503f',
            '1574258495973-f340df3d44cf',
        ];
        
        for ($i = 0; $i < $imageCount; $i++) {
            $imageId = fake()->randomElement($imageIds);
            $images[] = "https://images.unsplash.com/photo-{$imageId}?auto=format&fit=crop&w=800&q=80";
        }
        
        return $images;
    }
}

