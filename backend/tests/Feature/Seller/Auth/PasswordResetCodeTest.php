<?php

namespace Tests\Feature\Seller\Auth;

use App\Models\SellerPasswordResetCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordResetCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_can_verify_a_code_reset_the_password_and_log_in(): void
    {
        $seller = User::factory()->seller()->create([
            'email' => 'reset-seller@example.test',
            'password' => Hash::make('OldPassword!123'),
        ]);

        SellerPasswordResetCode::create([
            'user_id' => $seller->id,
            'email' => $seller->email,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
        ]);

        $token = $this->postJson('/api/seller/auth/verify-reset-code', [
            'email' => $seller->email,
            'code' => '123456',
        ])->assertOk()->json('data.reset_token');

        $this->assertIsString($token);
        $this->assertNotSame('', $token);

        $this->postJson('/api/seller/auth/reset-password', [
            'email' => $seller->email,
            'reset_token' => $token,
            'password' => 'NewPassword!123',
            'password_confirmation' => 'NewPassword!123',
        ])->assertOk();

        $seller->refresh();
        $this->assertTrue(Hash::check('NewPassword!123', $seller->password));
        $this->assertDatabaseMissing('seller_password_reset_codes', ['user_id' => $seller->id]);

        $this->postJson('/api/seller/auth/login', [
            'email' => $seller->email,
            'password' => 'NewPassword!123',
        ])->assertOk();
    }

    public function test_invalid_or_expired_code_cannot_open_a_reset_session(): void
    {
        $seller = User::factory()->seller()->create();
        SellerPasswordResetCode::create([
            'user_id' => $seller->id,
            'email' => $seller->email,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/seller/auth/verify-reset-code', [
            'email' => $seller->email,
            'code' => '123456',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.code.0', 'This verification code has expired. Request a new code and try again.');
    }
}
