<?php

namespace Tests\Feature\Buyer;

use App\Http\Resources\PublicStoreResource;
use App\Models\Store;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class SellerVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_anonymous_store_has_a_stable_public_code_and_no_private_store_data(): void
    {
        $store = Store::factory()->approved()->create([
            'name' => 'Private Optics Ltd',
            'email' => 'private@example.test',
            'phone' => '+39 555 0100',
            'seller_visibility' => Store::SELLER_VISIBILITY_ANONYMOUS,
        ])->fresh();

        $first = (new PublicStoreResource($store))->resolve(Request::create('/'));
        $second = (new PublicStoreResource($store->fresh()))->resolve(Request::create('/'));

        $this->assertMatchesRegularExpression('/^VX-[A-Z0-9]{6}$/', (string) $first['seller_code']);
        $this->assertSame($first['seller_code'], $second['seller_code']);
        $this->assertSame($first['seller_code'], $first['name']);
        $this->assertTrue($first['is_anonymous']);
        $this->assertNull($first['slug']);
        $this->assertNull($first['email']);
        $this->assertNull($first['phone']);
        $this->assertNull($first['description']);
    }

    public function test_anonymous_store_is_not_exposed_in_the_public_storefront_directory(): void
    {
        $visible = Store::factory()->approved()->create(['name' => 'Visible Optics']);
        Store::factory()->approved()->create([
            'name' => 'Anonymous Optics',
            'seller_visibility' => Store::SELLER_VISIBILITY_ANONYMOUS,
        ]);

        $stores = $this->getJson('/api/stores')
            ->assertOk()
            ->json('data.stores');

        $this->assertSame([$visible->name], collect($stores)->pluck('name')->all());
    }
}
