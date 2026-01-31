<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeographicControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Seed test data
        $this->seed(\Database\Seeders\CountrySeeder::class);
        $this->seed(\Database\Seeders\StateSeeder::class);
        $this->seed(\Database\Seeders\CitySeeder::class);
    }

    /**
     * Test getting all countries
     */
    public function test_can_get_all_countries(): void
    {
        $response = $this->getJson('/api/geographic/countries');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'code',
                        'phone_code',
                        'currency_code',
                        'is_active',
                    ],
                ],
            ])
            ->assertJson([
                'success' => true,
            ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertIsArray($data);
    }

    /**
     * Test getting only active countries
     */
    public function test_can_get_only_active_countries(): void
    {
        // Create an inactive country
        $inactiveCountry = Country::factory()->create([
            'name' => 'Inactive Country',
            'code' => 'INA',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/geographic/countries?active_only=true');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        // Verify inactive country is not in the response
        $countryIds = collect($data)->pluck('id')->toArray();
        $this->assertNotContains($inactiveCountry->id, $countryIds);
    }

    /**
     * Test getting all countries including inactive
     */
    public function test_can_get_all_countries_including_inactive(): void
    {
        $inactiveCountry = Country::factory()->create([
            'name' => 'Inactive Country',
            'code' => 'INA',
            'is_active' => false,
        ]);

        $response = $this->getJson('/api/geographic/countries?active_only=false');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $countryIds = collect($data)->pluck('id')->toArray();
        $this->assertContains($inactiveCountry->id, $countryIds);
    }

    /**
     * Test getting states by country
     */
    public function test_can_get_states_by_country(): void
    {
        $country = Country::where('code', 'USA')->first();
        
        $this->assertNotNull($country, 'USA country should exist in seeded data');

        $response = $this->getJson("/api/geographic/countries/{$country->id}/states");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'country_id',
                        'name',
                        'code',
                        'is_active',
                    ],
                ],
            ])
            ->assertJson([
                'success' => true,
            ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        
        // Verify all states belong to the country
        foreach ($data as $state) {
            $this->assertEquals($country->id, $state['country_id']);
        }
    }

    /**
     * Test getting states for non-existent country
     */
    public function test_get_states_returns_404_for_invalid_country(): void
    {
        $response = $this->getJson('/api/geographic/countries/99999/states');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Country not found',
            ]);
    }

    /**
     * Test getting only active states
     */
    public function test_can_get_only_active_states(): void
    {
        $country = Country::where('code', 'USA')->first();
        
        // Create an inactive state
        $inactiveState = State::factory()->create([
            'country_id' => $country->id,
            'name' => 'Inactive State',
            'code' => 'IN',
            'is_active' => false,
        ]);

        $response = $this->getJson("/api/geographic/countries/{$country->id}/states?active_only=true");

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $stateIds = collect($data)->pluck('id')->toArray();
        $this->assertNotContains($inactiveState->id, $stateIds);
    }

    /**
     * Test getting cities by state
     */
    public function test_can_get_cities_by_state(): void
    {
        $state = State::where('code', 'CA')->whereHas('country', function ($query) {
            $query->where('code', 'USA');
        })->first();
        
        $this->assertNotNull($state, 'California state should exist in seeded data');

        $response = $this->getJson("/api/geographic/states/{$state->id}/cities");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'state_id',
                        'name',
                        'is_active',
                    ],
                ],
            ])
            ->assertJson([
                'success' => true,
            ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        
        // Verify all cities belong to the state
        foreach ($data as $city) {
            $this->assertEquals($state->id, $city['state_id']);
        }
    }

    /**
     * Test getting cities for non-existent state (direct endpoint)
     */
    public function test_get_cities_by_state_returns_404_for_invalid_state(): void
    {
        $response = $this->getJson('/api/geographic/states/99999/cities');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'State not found',
            ]);
    }

    /**
     * Test getting only active cities
     */
    public function test_can_get_only_active_cities(): void
    {
        $state = State::where('code', 'CA')->whereHas('country', function ($query) {
            $query->where('code', 'USA');
        })->first();
        
        // Create an inactive city
        $inactiveCity = City::factory()->create([
            'state_id' => $state->id,
            'name' => 'Inactive City',
            'is_active' => false,
        ]);

        $response = $this->getJson("/api/geographic/states/{$state->id}/cities?active_only=true");

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $cityIds = collect($data)->pluck('id')->toArray();
        $this->assertNotContains($inactiveCity->id, $cityIds);
    }

    /**
     * Test getting cities by country and state
     */
    public function test_can_get_cities_by_country_and_state(): void
    {
        $country = Country::where('code', 'USA')->first();
        $state = State::where('code', 'CA')
            ->where('country_id', $country->id)
            ->first();
        
        $this->assertNotNull($country);
        $this->assertNotNull($state);

        $response = $this->getJson("/api/geographic/countries/{$country->id}/states/{$state->id}/cities");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    '*' => [
                        'id',
                        'state_id',
                        'name',
                        'is_active',
                    ],
                ],
            ])
            ->assertJson([
                'success' => true,
            ]);

        $data = $response->json('data');
        $this->assertNotEmpty($data);
        
        // Verify all cities belong to the state
        foreach ($data as $city) {
            $this->assertEquals($state->id, $city['state_id']);
        }
    }

    /**
     * Test getting cities with invalid country
     */
    public function test_get_cities_returns_404_for_invalid_country(): void
    {
        $state = State::first();
        
        $response = $this->getJson("/api/geographic/countries/99999/states/{$state->id}/cities");

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Country not found',
            ]);
    }

    /**
     * Test getting cities with invalid state (country-state endpoint)
     */
    public function test_get_cities_by_country_and_state_returns_404_for_invalid_state(): void
    {
        $country = Country::first();
        
        $response = $this->getJson("/api/geographic/countries/{$country->id}/states/99999/cities");

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'State not found',
            ]);
    }

    /**
     * Test getting cities when state doesn't belong to country
     */
    public function test_get_cities_returns_error_when_state_not_belongs_to_country(): void
    {
        $country1 = Country::where('code', 'USA')->first();
        $country2 = Country::where('code', 'GBR')->first();
        
        $state1 = State::where('country_id', $country1->id)->first();
        $state2 = State::where('country_id', $country2->id)->first();
        
        // Try to get cities using country1 but state2 (which belongs to country2)
        $response = $this->getJson("/api/geographic/countries/{$country1->id}/states/{$state2->id}/cities");

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'State does not belong to the specified country',
            ]);
    }

    /**
     * Test countries are ordered by name
     */
    public function test_countries_are_ordered_by_name(): void
    {
        $response = $this->getJson('/api/geographic/countries');

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $names = collect($data)->pluck('name')->toArray();
        $sortedNames = $names;
        sort($sortedNames);
        
        $this->assertEquals($sortedNames, $names);
    }

    /**
     * Test states are ordered by name
     */
    public function test_states_are_ordered_by_name(): void
    {
        $country = Country::where('code', 'USA')->first();
        
        $response = $this->getJson("/api/geographic/countries/{$country->id}/states");

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $names = collect($data)->pluck('name')->toArray();
        $sortedNames = $names;
        sort($sortedNames);
        
        $this->assertEquals($sortedNames, $names);
    }

    /**
     * Test cities are ordered by name
     */
    public function test_cities_are_ordered_by_name(): void
    {
        $state = State::where('code', 'CA')->whereHas('country', function ($query) {
            $query->where('code', 'USA');
        })->first();
        
        $response = $this->getJson("/api/geographic/states/{$state->id}/cities");

        $response->assertStatus(200);
        $data = $response->json('data');
        
        $names = collect($data)->pluck('name')->toArray();
        $sortedNames = $names;
        sort($sortedNames);
        
        $this->assertEquals($sortedNames, $names);
    }
}
