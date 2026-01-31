<?php

namespace Database\Factories;

use App\Models\Country;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Country>
 */
class CountryFactory extends Factory
{
    protected $model = Country::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $countryName = fake()->country();
        $code = strtoupper(substr($countryName, 0, 3));

        return [
            'name' => $countryName,
            'code' => $code . fake()->unique()->numberBetween(100, 999),
            'phone_code' => '+' . fake()->numberBetween(1, 999),
            'currency_code' => strtoupper(fake()->currencyCode()),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the country is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
