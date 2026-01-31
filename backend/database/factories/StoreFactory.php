<?php

namespace Database\Factories;

use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Store>
 */
class StoreFactory extends Factory
{
    protected $model = Store::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company() . ' Optics';
        return [
            'user_id' => User::factory()->seller(),
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->paragraph(3),
            'email' => fake()->companyEmail(),
            'phone' => fake()->phoneNumber(),
            'profile_image' => null,
            'banner_image' => null,
            'theme_color' => fake()->hexColor(),
            'phone_visibility' => fake()->randomElement(['public', 'request', 'hidden']),
            'status' => 'active',
            'is_active' => true,
            'onboarding_status' => 'approved',
            'onboarding_level' => 5,
            'onboarding_percent' => 100,
            'meta' => null,
        ];
    }

    /**
     * Indicate that the store is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
            'onboarding_status' => 'pending',
            'onboarding_level' => 1,
            'onboarding_percent' => 20,
        ]);
    }
}

