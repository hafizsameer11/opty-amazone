<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeographicModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test Country model creation
     */
    public function test_can_create_country(): void
    {
        $country = Country::create([
            'name' => 'Test Country',
            'code' => 'TST',
            'phone_code' => '+999',
            'currency_code' => 'TST',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('countries', [
            'name' => 'Test Country',
            'code' => 'TST',
        ]);

        $this->assertEquals('Test Country', $country->name);
        $this->assertEquals('TST', $country->code);
        $this->assertTrue($country->is_active);
    }

    /**
     * Test Country has many States relationship
     */
    public function test_country_has_many_states(): void
    {
        $country = Country::factory()->create();
        
        $state1 = State::factory()->create(['country_id' => $country->id]);
        $state2 = State::factory()->create(['country_id' => $country->id]);
        $state3 = State::factory()->create(['country_id' => $country->id]);

        $this->assertCount(3, $country->states);
        $this->assertTrue($country->states->contains($state1));
        $this->assertTrue($country->states->contains($state2));
        $this->assertTrue($country->states->contains($state3));
    }

    /**
     * Test Country activeStates relationship
     */
    public function test_country_active_states_relationship(): void
    {
        $country = Country::factory()->create();
        
        $activeState1 = State::factory()->create([
            'country_id' => $country->id,
            'is_active' => true,
        ]);
        $activeState2 = State::factory()->create([
            'country_id' => $country->id,
            'is_active' => true,
        ]);
        $inactiveState = State::factory()->create([
            'country_id' => $country->id,
            'is_active' => false,
        ]);

        $activeStates = $country->activeStates;

        $this->assertCount(2, $activeStates);
        $this->assertTrue($activeStates->contains($activeState1));
        $this->assertTrue($activeStates->contains($activeState2));
        $this->assertFalse($activeStates->contains($inactiveState));
    }

    /**
     * Test State model creation
     */
    public function test_can_create_state(): void
    {
        $country = Country::factory()->create();
        
        $state = State::create([
            'country_id' => $country->id,
            'name' => 'Test State',
            'code' => 'TS',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('states', [
            'country_id' => $country->id,
            'name' => 'Test State',
            'code' => 'TS',
        ]);

        $this->assertEquals('Test State', $state->name);
        $this->assertEquals($country->id, $state->country_id);
    }

    /**
     * Test State belongs to Country relationship
     */
    public function test_state_belongs_to_country(): void
    {
        $country = Country::factory()->create();
        $state = State::factory()->create(['country_id' => $country->id]);

        $this->assertInstanceOf(Country::class, $state->country);
        $this->assertEquals($country->id, $state->country->id);
        $this->assertEquals($country->name, $state->country->name);
    }

    /**
     * Test State has many Cities relationship
     */
    public function test_state_has_many_cities(): void
    {
        $state = State::factory()->create();
        
        $city1 = City::factory()->create(['state_id' => $state->id]);
        $city2 = City::factory()->create(['state_id' => $state->id]);
        $city3 = City::factory()->create(['state_id' => $state->id]);

        $this->assertCount(3, $state->cities);
        $this->assertTrue($state->cities->contains($city1));
        $this->assertTrue($state->cities->contains($city2));
        $this->assertTrue($state->cities->contains($city3));
    }

    /**
     * Test State activeCities relationship
     */
    public function test_state_active_cities_relationship(): void
    {
        $state = State::factory()->create();
        
        $activeCity1 = City::factory()->create([
            'state_id' => $state->id,
            'is_active' => true,
        ]);
        $activeCity2 = City::factory()->create([
            'state_id' => $state->id,
            'is_active' => true,
        ]);
        $inactiveCity = City::factory()->create([
            'state_id' => $state->id,
            'is_active' => false,
        ]);

        $activeCities = $state->activeCities;

        $this->assertCount(2, $activeCities);
        $this->assertTrue($activeCities->contains($activeCity1));
        $this->assertTrue($activeCities->contains($activeCity2));
        $this->assertFalse($activeCities->contains($inactiveCity));
    }

    /**
     * Test City model creation
     */
    public function test_can_create_city(): void
    {
        $state = State::factory()->create();
        
        $city = City::create([
            'state_id' => $state->id,
            'name' => 'Test City',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('cities', [
            'state_id' => $state->id,
            'name' => 'Test City',
        ]);

        $this->assertEquals('Test City', $city->name);
        $this->assertEquals($state->id, $city->state_id);
    }

    /**
     * Test City belongs to State relationship
     */
    public function test_city_belongs_to_state(): void
    {
        $state = State::factory()->create();
        $city = City::factory()->create(['state_id' => $state->id]);

        $this->assertInstanceOf(State::class, $city->state);
        $this->assertEquals($state->id, $city->state->id);
        $this->assertEquals($state->name, $city->state->name);
    }

    /**
     * Test cascade delete - deleting country deletes states
     */
    public function test_deleting_country_cascades_to_states(): void
    {
        $country = Country::factory()->create();
        $state = State::factory()->create(['country_id' => $country->id]);
        $city = City::factory()->create(['state_id' => $state->id]);

        $country->delete();

        $this->assertDatabaseMissing('countries', ['id' => $country->id]);
        $this->assertDatabaseMissing('states', ['id' => $state->id]);
        $this->assertDatabaseMissing('cities', ['id' => $city->id]);
    }

    /**
     * Test cascade delete - deleting state deletes cities
     */
    public function test_deleting_state_cascades_to_cities(): void
    {
        $state = State::factory()->create();
        $city = City::factory()->create(['state_id' => $state->id]);

        $state->delete();

        $this->assertDatabaseMissing('states', ['id' => $state->id]);
        $this->assertDatabaseMissing('cities', ['id' => $city->id]);
    }

    /**
     * Test Country code uniqueness
     */
    public function test_country_code_must_be_unique(): void
    {
        Country::factory()->create(['code' => 'TST']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        
        Country::factory()->create(['code' => 'TST']);
    }

    /**
     * Test Country fillable attributes
     */
    public function test_country_fillable_attributes(): void
    {
        $country = new Country();
        $fillable = $country->getFillable();

        $this->assertContains('name', $fillable);
        $this->assertContains('code', $fillable);
        $this->assertContains('phone_code', $fillable);
        $this->assertContains('currency_code', $fillable);
        $this->assertContains('is_active', $fillable);
    }

    /**
     * Test State fillable attributes
     */
    public function test_state_fillable_attributes(): void
    {
        $state = new State();
        $fillable = $state->getFillable();

        $this->assertContains('country_id', $fillable);
        $this->assertContains('name', $fillable);
        $this->assertContains('code', $fillable);
        $this->assertContains('is_active', $fillable);
    }

    /**
     * Test City fillable attributes
     */
    public function test_city_fillable_attributes(): void
    {
        $city = new City();
        $fillable = $city->getFillable();

        $this->assertContains('state_id', $fillable);
        $this->assertContains('name', $fillable);
        $this->assertContains('is_active', $fillable);
    }

    /**
     * Test Country casts is_active to boolean
     */
    public function test_country_is_active_is_casted_to_boolean(): void
    {
        $country = Country::factory()->create(['is_active' => 1]);
        
        $this->assertIsBool($country->is_active);
        $this->assertTrue($country->is_active);
    }

    /**
     * Test State casts is_active to boolean
     */
    public function test_state_is_active_is_casted_to_boolean(): void
    {
        $state = State::factory()->create(['is_active' => 1]);
        
        $this->assertIsBool($state->is_active);
        $this->assertTrue($state->is_active);
    }

    /**
     * Test City casts is_active to boolean
     */
    public function test_city_is_active_is_casted_to_boolean(): void
    {
        $city = City::factory()->create(['is_active' => 1]);
        
        $this->assertIsBool($city->is_active);
        $this->assertTrue($city->is_active);
    }
}
