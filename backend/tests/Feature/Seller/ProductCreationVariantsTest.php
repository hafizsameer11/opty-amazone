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

    /**
     * The seller "Add Variant" flow can capture per-size stock while the product
     * is still a draft, so the create endpoint must accept and persist
     * `variants.*.sizes` in one request.
     */
    public function test_seller_can_create_a_variant_with_sizes_in_the_same_request(): void
    {
        $seller = User::factory()->seller()->create();
        $store = Store::create([
            'user_id' => $seller->id,
            'name' => 'Sized Optics',
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
            'name' => 'Sized frame',
            'category_id' => $category->id,
            'product_type' => 'frame',
            'price' => 79.95,
            'stock_quantity' => 7,
            'stock_status' => 'in_stock',
            'images' => [],
            'variants' => [[
                'color_name' => 'Midnight',
                'color_code' => '#111111',
                'images' => [],
                'price' => 79.95,
                'stock_quantity' => 7,
                'stock_status' => 'in_stock',
                'is_default' => true,
                'sizes' => [
                    [
                        'size_label' => '52-18-140',
                        'lens_width' => 52,
                        'bridge_width' => 18,
                        'temple_length' => 140,
                        'stock_quantity' => 3,
                        'stock_status' => 'in_stock',
                    ],
                    [
                        'size_label' => 'Medium',
                        'stock_quantity' => 4,
                        'stock_status' => 'in_stock',
                    ],
                ],
            ]],
        ])->assertOk()
            ->assertJsonPath('data.variants.0.color_name', 'Midnight');

        $product = Product::with('variants')->firstOrFail();
        $this->assertSame($store->id, $product->store_id);
        $this->assertCount(1, $product->variants);

        $variant = $product->variants->first();
        $sizes = $variant->frameSizes()->get();

        $this->assertCount(2, $sizes);
        // Compare as a set: the relation orders by lens_width, so ordering here
        // is not meaningful.
        $this->assertEqualsCanonicalizing(
            ['Medium', '52-18-140'],
            $sizes->pluck('size_label')->all()
        );

        $compact = $sizes->firstWhere('size_label', '52-18-140');
        $this->assertSame(52, (int) $compact->lens_width);
        $this->assertSame(18, (int) $compact->bridge_width);
        $this->assertSame(140, (int) $compact->temple_length);
        $this->assertSame(3, (int) $compact->stock_quantity);

        $medium = $sizes->firstWhere('size_label', 'Medium');
        $this->assertSame(4, (int) $medium->stock_quantity);

        // The variant stock is derived from the sizes, not taken from the request.
        $this->assertSame(7, (int) $variant->stock_quantity);
        $this->assertSame('in_stock', $variant->stock_status);
    }

    public function test_variant_sizes_are_optional_and_still_accepted(): void
    {
        $seller = User::factory()->seller()->create();
        Store::create([
            'user_id' => $seller->id,
            'name' => 'Sizeless Optics',
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

        // Regression guard: the previous no-sizes payload must keep working.
        $this->postJson('/api/seller/products', [
            'name' => 'Plain frame',
            'category_id' => $category->id,
            'product_type' => 'frame',
            'price' => 59.95,
            'stock_quantity' => 2,
            'stock_status' => 'in_stock',
            'images' => [],
            'variants' => [[
                'color_name' => 'Black',
                'color_code' => '#000000',
                'images' => [],
                'stock_quantity' => 2,
                'stock_status' => 'in_stock',
                'is_default' => true,
            ]],
        ])->assertOk();

        $variant = Product::with('variants')->firstOrFail()->variants->first();
        $this->assertCount(0, $variant->frameSizes()->get());
        $this->assertSame(2, (int) $variant->stock_quantity);
    }

    public function test_a_size_row_without_a_label_is_rejected(): void
    {
        $seller = User::factory()->seller()->create();
        Store::create([
            'user_id' => $seller->id,
            'name' => 'Strict Optics',
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
            'name' => 'Bad size frame',
            'category_id' => $category->id,
            'product_type' => 'frame',
            'price' => 59.95,
            'stock_quantity' => 2,
            'stock_status' => 'in_stock',
            'images' => [],
            'variants' => [[
                'color_name' => 'Black',
                'color_code' => '#000000',
                'images' => [],
                'stock_quantity' => 2,
                'stock_status' => 'in_stock',
                'is_default' => true,
                'sizes' => [['stock_quantity' => 2, 'stock_status' => 'in_stock']],
            ]],
        ])->assertStatus(422)->assertJsonValidationErrors('variants.0.sizes.0.size_label');
    }
}
