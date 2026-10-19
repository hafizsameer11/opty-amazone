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
            'profile_image' => 'stores/private-profile.webp',
            'banner_image' => 'stores/private-banner.webp',
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
        $this->assertSame('stores/private-profile.webp', $first['profile_image']);
        $this->assertSame('stores/private-banner.webp', $first['banner_image']);
    }

    public function test_anonymous_store_remains_in_the_public_storefront_directory_under_its_code(): void
    {
        $visible = Store::factory()->approved()->create(['name' => 'Visible Optics']);
        $anonymous = Store::factory()->approved()->create([
            'name' => 'Anonymous Optics',
            'seller_visibility' => Store::SELLER_VISIBILITY_ANONYMOUS,
        ]);

        $stores = $this->getJson('/api/stores')
            ->assertOk()
            ->json('data.stores');

        $names = collect($stores)->pluck('name')->all();
        $this->assertContains($visible->name, $names);
        $this->assertContains($anonymous->public_seller_code, $names);
        $this->assertNotContains($anonymous->name, $names);

        $this->getJson('/api/stores/'.$anonymous->id)
            ->assertOk()
            ->assertJsonPath('data.store.name', $anonymous->public_seller_code)
            ->assertJsonPath('data.store.is_anonymous', true)
            ->assertJsonPath('data.store.email', null);

        $this->getJson('/api/search?q='.$anonymous->public_seller_code)
            ->assertOk()
            ->assertJsonPath('data.stores.0.name', $anonymous->public_seller_code)
            ->assertJsonPath('data.stores.0.is_anonymous', true);

        $storesFoundByPrivateName = $this->getJson('/api/search?q=Anonymous')
            ->assertOk()
            ->json('data.stores');

        $this->assertFalse(collect($storesFoundByPrivateName)->contains('id', $anonymous->id));
    }
}
