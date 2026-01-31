<?php

namespace Tests\Feature\Buyer\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'buyer@test.com',
            'password' => Hash::make('password123'),
            'role' => 'buyer',
        ]);

        $response = $this->postJson('/api/buyer/auth/login', [
            'email' => 'buyer@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
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

        $this->assertNotNull($response->json('data.token'));
    }

    public function test_buyer_cannot_login_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'buyer@test.com',
            'password' => Hash::make('password123'),
            'role' => 'buyer',
        ]);

        $response = $this->postJson('/api/buyer/auth/login', [
            'email' => 'buyer@test.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_seller_cannot_login_as_buyer(): void
    {
        User::factory()->create([
            'email' => 'seller@test.com',
            'password' => Hash::make('password123'),
            'role' => 'seller',
        ]);

        $response = $this->postJson('/api/buyer/auth/login', [
            'email' => 'seller@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }
}
