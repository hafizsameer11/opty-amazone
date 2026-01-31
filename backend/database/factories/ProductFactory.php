<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Store;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $productTypes = ['frame', 'sunglasses', 'contact_lens', 'eye_hygiene', 'accessory'];
        $productType = fake()->randomElement($productTypes);
        $name = $this->generateProductName($productType);
        
        $price = fake()->randomFloat(2, 29.99, 499.99);
        $compareAtPrice = fake()->boolean(30) ? $price + fake()->randomFloat(2, 20, 100) : null;

        return [
            'store_id' => Store::factory(),
            'category_id' => Category::factory(),
            'sub_category_id' => null,
            'name' => $name,
            'slug' => Str::slug($name) . '-' . fake()->unique()->numberBetween(1000, 9999),
            'sku' => 'SKU-' . strtoupper(Str::random(8)),
            'description' => fake()->paragraph(5),
            'short_description' => fake()->sentence(),
            'product_type' => $productType,
            'price' => $price,
            'compare_at_price' => $compareAtPrice,
            'cost_price' => $price * 0.6, // 40% margin
            'stock_quantity' => fake()->numberBetween(0, 200),
            'stock_status' => fake()->randomElement(['in_stock', 'out_of_stock', 'backorder']),
            'images' => $this->generateImages(),
            'frame_shape' => $productType === 'frame' || $productType === 'sunglasses' 
                ? fake()->randomElement(['round', 'square', 'oval', 'cat-eye', 'aviator', 'rectangular', 'browline'])
                : null,
            'frame_material' => $productType === 'frame' || $productType === 'sunglasses'
                ? fake()->randomElement(['acetate', 'metal', 'titanium', 'plastic', 'wood', 'carbon'])
                : null,
            'frame_color' => $productType === 'frame' || $productType === 'sunglasses'
                ? fake()->randomElement(['Black', 'Brown', 'Tortoise', 'Blue', 'Red', 'Gold', 'Silver', 'Gunmetal'])
                : null,
            'gender' => fake()->randomElement(['men', 'women', 'unisex', 'kids']),
            'lens_type' => $productType === 'frame' ? fake()->randomElement(['single_vision', 'progressive', 'bifocal']) : null,
            'lens_index_options' => $productType === 'frame' 
                ? json_encode(['1.50', '1.56', '1.61', '1.67'])
                : null,
            'treatment_options' => $productType === 'frame'
                ? json_encode(['anti_glare', 'blue_light', 'uv_protection', 'photochromic'])
                : null,
            'rating' => fake()->randomFloat(2, 3.5, 5.0),
            'review_count' => fake()->numberBetween(0, 500),
            'view_count' => fake()->numberBetween(0, 5000),
            'is_featured' => fake()->boolean(20),
            'is_active' => true,
            'meta_title' => $name . ' - Premium Optical Products',
            'meta_description' => fake()->sentence(),
            'meta_keywords' => implode(', ', fake()->words(5)),
        ];
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
            ],
            'contact_lens' => [
                'Daily Disposable Contact Lenses',
                'Monthly Contact Lenses',
                'Toric Contact Lenses',
                'Multifocal Contact Lenses',
                'Colored Contact Lenses',
                'Astigmatism Contact Lenses',
            ],
            'eye_hygiene' => [
                'Eye Drops Solution',
                'Contact Lens Solution',
                'Lens Cleaning Wipes',
                'Eye Care Kit',
                'Tear Drops',
            ],
            'accessory' => [
                'Eyeglass Case',
                'Lens Cleaning Cloth',
                'Eyeglass Chain',
                'Nose Pads',
                'Temple Tips',
            ],
        ];

        return fake()->randomElement($names[$type] ?? ['Optical Product']);
    }

    /**
     * Generate product images.
     */
    private function generateImages(): array
    {
        $imageCount = fake()->numberBetween(1, 4);
        $images = [];
        
        for ($i = 0; $i < $imageCount; $i++) {
            $images[] = 'https://images.unsplash.com/photo-' . 
                fake()->numberBetween(1500000000000, 1700000000000) . 
                '?auto=format&fit=crop&w=800&q=80';
        }
        
        return $images;
    }
}

