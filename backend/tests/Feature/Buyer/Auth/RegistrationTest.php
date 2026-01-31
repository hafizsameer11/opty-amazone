<?php

namespace Tests\Feature\Buyer\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_register(): void
    {
        $response = $this->postJson('/api/buyer/auth/register', [
            'name' => 'Test Buyer',
            'email' => 'buyer@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'user' => [
                        'id',
                        'name',
                        'email',
                        'role',
                    ],
                    'token',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'buyer@test.com',
            'role' => 'buyer',
        ]);
    }

    public function test_buyer_registration_requires_valid_email(): void
    {
        $response = $this->postJson('/api/buyer/auth/register', [
            'name' => 'Test Buyer',
            'email' => 'invalid-email',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_buyer_registration_requires_unique_email(): void
    {
        User::factory()->create([
            'email' => 'existing@test.com',
            'role' => 'buyer',
        ]);

        $response = $this->postJson('/api/buyer/auth/register', [
            'name' => 'Test Buyer',
            'email' => 'existing@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_buyer_registration_requires_password_confirmation(): void
    {
        $response = $this->postJson('/api/buyer/auth/register', [
            'name' => 'Test Buyer',
            'email' => 'buyer@test.com',
            'password' => 'password123',
            'password_confirmation' => 'different',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
