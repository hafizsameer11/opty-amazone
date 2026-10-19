<?php

namespace Tests\Feature\Seller;

use App\Models\Category;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactLensCreationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_save_and_reload_contact_lens_prescription_and_pack_configuration_after_creation(): void
    {
        $seller = User::factory()->seller()->create();
        Store::create([
            'user_id' => $seller->id,
            'name' => 'Lens Flow Optics',
            'slug' => (string) Str::uuid(),
            'status' => 'active',
            'is_active' => true,
        ]);
        $category = Category::create([
            'name' => 'Contact lenses',
            'slug' => 'contact-lenses',
            'is_active' => true,
        ]);

        Sanctum::actingAs($seller, ['seller']);

        $productId = $this->postJson('/api/seller/products', [
            'name' => 'Monthly lenses',
            'category_id' => $category->id,
            'product_type' => 'contact_lens',
            'price' => 24.95,
            'stock_quantity' => 20,
            'stock_status' => 'in_stock',
            'images' => [],
        ])->assertOk()
            ->assertJsonPath('data.product_type', 'contact_lens')
            ->json('data.id');

        $this->postJson("/api/seller/products/{$productId}/prescription-dropdowns", [
            'values' => [
                [
                    'field_type' => 'pwr',
                    'value' => '-2.25',
                    'label' => '-2.25',
                    'eye_type' => 'right',
                    'is_active' => true,
                    'sort_order' => 0,
                ],
                [
                    'field_type' => 'base_curve',
                    'value' => '8.60',
                    'label' => '8.60',
                    'is_active' => true,
                    'sort_order' => 0,
                ],
            ],
        ])->assertOk();

        $this->putJson("/api/seller/products/{$productId}", [
            'contact_lens_unit_config' => [
                'packs' => [
                    [
                        'quantity' => 30,
                        'price' => 22.50,
                        'images' => ['https://example.test/monthly-lenses.webp'],
                    ],
                ],
                'qty_options' => [1, 2, 3],
            ],
        ])->assertOk()
            ->assertJsonPath('data.contact_lens_unit_config.packs.0.quantity', 30)
            ->assertJsonPath('data.contact_lens_unit_config.packs.0.price', 22.5)
            ->assertJsonPath('data.contact_lens_unit_config.qty_options.2', 3);

        $this->getJson("/api/seller/products/{$productId}")
            ->assertOk()
            ->assertJsonPath('data.contact_lens_unit_config.packs.0.quantity', 30)
            ->assertJsonPath('data.contact_lens_unit_config.qty_options.0', 1);

        $this->getJson("/api/seller/products/{$productId}/prescription-dropdowns")
            ->assertOk()
            ->assertJsonPath('data.values.pwr.0.value', '-2.25')
            ->assertJsonPath('data.values.base_curve.0.value', '8.60');
    }
}
