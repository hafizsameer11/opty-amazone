<?php

namespace Tests\Feature\Buyer;

use App\Models\Store;
use App\Models\StoreReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicStoreSortingTest extends TestCase
{
    use RefreshDatabase;

    private function storeWithRating(string $name, int $stars): Store
    {
        $store = Store::factory()->approved()->create(['name' => $name]);
        $buyer = User::factory()->create();

        StoreReview::create([
            'store_id' => $store->id,
            'user_id' => $buyer->id,
            'rating' => $stars,
            'is_verified_purchase' => true,
        ]);

        return $store->fresh();
    }

    public function test_stores_are_returned_highest_rated_first(): void
    {
        $low = $this->storeWithRating('Low rated optics', 2);
        $high = $this->storeWithRating('High rated optics', 5);
        $mid = $this->storeWithRating('Mid rated optics', 4);

        $names = collect($this->getJson('/api/stores?sort=rating_desc')->assertOk()->json('data.stores'))
            ->pluck('name')
            ->all();

        $this->assertSame([$high->name, $mid->name, $low->name], array_slice($names, 0, 3));
    }

    public function test_unrated_stores_are_pushed_to_the_end_not_treated_as_zero(): void
    {
        $unrated = Store::factory()->approved()->create(['name' => 'No reviews yet']);
        $rated = $this->storeWithRating('Genuinely rated', 1);

        $names = collect($this->getJson('/api/stores?sort=rating_desc')->assertOk()->json('data.stores'))
            ->pluck('name')
            ->all();

        // A 1-star store must rank above a store with no reviews at all.
        $this->assertSame($rated->name, $names[0]);
        $this->assertSame($unrated->name, end($names));
    }

    public function test_only_verified_purchases_affect_the_ordering(): void
    {
        $store = Store::factory()->approved()->create(['name' => 'Mixed reviews']);
        $verifiedBuyer = User::factory()->create();
        $unverifiedBuyer = User::factory()->create();

        // A 1-star verified review and a 5-star unverified one.
        StoreReview::create([
            'store_id' => $store->id, 'user_id' => $verifiedBuyer->id,
            'rating' => 1, 'is_verified_purchase' => true,
        ]);
        StoreReview::create([
            'store_id' => $store->id, 'user_id' => $unverifiedBuyer->id,
            'rating' => 5, 'is_verified_purchase' => false,
        ]);

        $data = $this->getJson('/api/stores?sort=rating_desc')->assertOk()->json('data.stores.0');

        // Displayed rating and sort key must agree: the unverified 5 is ignored.
        $this->assertSame(1.0, (float) $data['rating']);
    }

    public function test_default_and_unknown_sorts_keep_existing_behaviour(): void
    {
        Store::factory()->approved()->create(['name' => 'Alpha']);
        Store::factory()->approved()->create(['name' => 'Beta']);

        // No sort parameter must not error.
        $this->getJson('/api/stores')->assertOk()->assertJsonCount(2, 'data.stores');

        // An unknown value must be ignored rather than 500.
        $this->getJson('/api/stores?sort=%3Bdrop%20table')->assertOk()->assertJsonCount(2, 'data.stores');

        // The other whitelisted orders still work.
        $this->getJson('/api/stores?sort=name_asc')->assertOk();
        $this->getJson('/api/stores?sort=newest')->assertOk();
        $this->getJson('/api/stores?sort=rating_asc')->assertOk();
    }

    public function test_suspended_and_inactive_stores_never_appear(): void
    {
        Store::factory()->approved()->create(['name' => 'Live store']);
        Store::factory()->suspended()->create(['name' => 'Suspended store']);
        Store::factory()->pending()->create(['name' => 'Pending store']);

        $names = collect($this->getJson('/api/stores?sort=rating_desc')->assertOk()->json('data.stores'))
            ->pluck('name')
            ->all();

        $this->assertSame(['Live store'], $names);
    }
}