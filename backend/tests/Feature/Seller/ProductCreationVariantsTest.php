<?php

namespace Tests\Feature\Seller;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductCreationVariantsTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_create_an_eyewear_product_with_variant_images_but_no_main_images(): void
    {
        $seller = User::factory()->seller()->create();
        $store = Store::create([
            'user_id' => $seller->id,
            'name' => 'Variant Optics',
            'slug' => (string) Str::uuid(),
            'status' => 'active',
            'is_active' => true,
        ]);
        $category = Category::create([
            'name' => 'Frames',
            'slug' => 'frames-' . Str::lower(Str::random(8)),
            'is_active' => true,
        ]);

        Sanctum::actingAs($seller, ['seller']);

        $this->postJson('/api/seller/products', [
            'name' => 'Image-free frame',
            'category_id' => $category->id,
            'product_type' => 'frame',
            'price' => 99.95,
            'stock_quantity' => 4,
            'stock_status' => 'in_stock',
            'images' => [],
            'variants' => [[
                'color_name' => 'Ocean Blue',
                'color_code' => '#0044AA',
                'images' => ['https://example.test/blue-frame.jpg'],
                'stock_quantity' => 4,
                'stock_status' => 'in_stock',
                'is_default' => true,
            ]],
        ])->assertOk()
            ->assertJsonPath('data.images', [])
            ->assertJsonPath('data.variants.0.color_name', 'Ocean Blue')
            ->assertJsonPath('data.variants.0.images.0', 'https://example.test/blue-frame.jpg');

        $product = Product::with('variants')->firstOrFail();
        $this->assertSame($store->id, $product->store_id);
        $this->assertCount(1, $product->variants);
        $this->assertSame([], $product->images);

        $this->getJson('/api/seller/products')
            ->assertOk()
            ->assertJsonPath('data.data.0.variants.0.images.0', 'https://example.test/blue-frame.jpg');
    }
}
