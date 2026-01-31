<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeographicSeederTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test CountrySeeder seeds countries
     */
    public function test_country_seeder_seeds_countries(): void
    {
        $this->seed(\Database\Seeders\CountrySeeder::class);

        $this->assertDatabaseHas('countries', [
            'code' => 'USA',
            'name' => 'United States',
        ]);

        $this->assertDatabaseHas('countries', [
            'code' => 'GBR',
            'name' => 'United Kingdom',
        ]);

        $this->assertDatabaseHas('countries', [
            'code' => 'CAN',
            'name' => 'Canada',
        ]);

        $countries = Country::all();
        $this->assertGreaterThan(30, $countries->count());
    }

    /**
     * Test StateSeeder seeds states
     */
    public function test_state_seeder_seeds_states(): void
    {
        $this->seed(\Database\Seeders\CountrySeeder::class);
        $this->seed(\Database\Seeders\StateSeeder::class);

        $usa = Country::where('code', 'USA')->first();
        $this->assertNotNull($usa);

        // Check for some US states
        $this->assertDatabaseHas('states', [
            'country_id' => $usa->id,
            'code' => 'CA',
            'name' => 'California',
        ]);

        $this->assertDatabaseHas('states', [
            'country_id' => $usa->id,
            'code' => 'NY',
            'name' => 'New York',
        ]);

        $this->assertDatabaseHas('states', [
            'country_id' => $usa->id,
            'code' => 'TX',
            'name' => 'Texas',
        ]);

        $usStates = State::where('country_id', $usa->id)->get();
        $this->assertGreaterThanOrEqual(50, $usStates->count());
    }

    /**
     * Test CitySeeder seeds cities
     */
    public function test_city_seeder_seeds_cities(): void
    {
        $this->seed(\Database\Seeders\CountrySeeder::class);
        $this->seed(\Database\Seeders\StateSeeder::class);
        $this->seed(\Database\Seeders\CitySeeder::class);

        $california = State::where('code', 'CA')
            ->whereHas('country', function ($query) {
                $query->where('code', 'USA');
            })
            ->first();

        $this->assertNotNull($california);

        // Check for some California cities
        $this->assertDatabaseHas('cities', [
            'state_id' => $california->id,
            'name' => 'Los Angeles',
        ]);

        $this->assertDatabaseHas('cities', [
            'state_id' => $california->id,
            'name' => 'San Francisco',
        ]);

        $californiaCities = City::where('state_id', $california->id)->get();
        $this->assertGreaterThan(0, $californiaCities->count());
    }

    /**
     * Test DatabaseSeeder includes geographic seeders
     */
    public function test_database_seeder_includes_geographic_seeders(): void
    {
        $this->seed();

        // Verify countries are seeded
        $countries = Country::all();
        $this->assertGreaterThan(0, $countries->count());

        // Verify states are seeded
        $states = State::all();
        $this->assertGreaterThan(0, $states->count());

        // Verify cities are seeded
        $cities = City::all();
        $this->assertGreaterThan(0, $cities->count());
    }

    /**
     * Test seeders are idempotent (can run multiple times)
     */
    public function test_seeders_are_idempotent(): void
    {
        // Run seeders twice
        $this->seed(\Database\Seeders\CountrySeeder::class);
        $this->seed(\Database\Seeders\CountrySeeder::class);

        $firstCount = Country::count();

        $this->seed(\Database\Seeders\CountrySeeder::class);
        $secondCount = Country::count();

        // Should have the same count (no duplicates)
        $this->assertEquals($firstCount, $secondCount);
    }

    /**
     * Test all seeded countries have required fields
     */
    public function test_seeded_countries_have_required_fields(): void
    {
        $this->seed(\Database\Seeders\CountrySeeder::class);

        $countries = Country::all();

        foreach ($countries as $country) {
            $this->assertNotEmpty($country->name);
            $this->assertNotEmpty($country->code);
            $this->assertNotNull($country->is_active);
        }
    }

    /**
     * Test all seeded states belong to valid countries
     */
    public function test_seeded_states_belong_to_valid_countries(): void
    {
        $this->seed(\Database\Seeders\CountrySeeder::class);
        $this->seed(\Database\Seeders\StateSeeder::class);

        $states = State::all();

        foreach ($states as $state) {
            $this->assertNotNull($state->country);
            $this->assertInstanceOf(Country::class, $state->country);
        }
    }

    /**
     * Test all seeded cities belong to valid states
     */
    public function test_seeded_cities_belong_to_valid_states(): void
    {
        $this->seed(\Database\Seeders\CountrySeeder::class);
        $this->seed(\Database\Seeders\StateSeeder::class);
        $this->seed(\Database\Seeders\CitySeeder::class);

        $cities = City::all();

        foreach ($cities as $city) {
            $this->assertNotNull($city->state);
            $this->assertInstanceOf(State::class, $city->state);
        }
    }
}
