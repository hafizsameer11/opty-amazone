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
        $name = fake()->unique()->company() . ' Optics';
        return [
            'user_id' => User::factory()->seller(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
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
            'status' => Store::STATUS_PENDING,
            'onboarding_status' => Store::ONBOARDING_PENDING,
            'onboarding_level' => 1,
            'onboarding_percent' => 20,
        ]);
    }

    /**
     * A registration whose verification has been submitted for review.
     */
    public function pendingReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Store::STATUS_PENDING,
            'onboarding_status' => Store::ONBOARDING_PENDING_REVIEW,
            'onboarding_level' => 4,
            'onboarding_percent' => 80,
        ]);
    }

    /**
     * An approved, live store.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Store::STATUS_ACTIVE,
            'onboarding_status' => Store::ONBOARDING_APPROVED,
            'is_active' => true,
            'onboarding_level' => 5,
            'onboarding_percent' => 100,
        ]);
    }

    /**
     * A store whose registration the admin refused.
     */
    public function rejected(string $reason = 'Documents could not be verified.'): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Store::STATUS_REJECTED,
            'onboarding_status' => Store::ONBOARDING_REJECTED,
            'is_active' => false,
            'meta' => ['rejection_reason' => $reason, 'rejected_at' => now()->toIso8601String()],
        ]);
    }

    /**
     * A live store hidden from buyers by moderation.
     */
    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Store::STATUS_SUSPENDED,
            'onboarding_status' => Store::ONBOARDING_APPROVED,
            'is_active' => false,
        ]);
    }
}

