<?php

namespace Tests\Feature\Seller\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_register(): void
    {
        $response = $this->postJson('/api/seller/auth/register', [
            'name' => 'Test Seller',
            'email' => 'seller@test.com',
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
            'email' => 'seller@test.com',
            'role' => 'seller',
        ]);
    }
}
