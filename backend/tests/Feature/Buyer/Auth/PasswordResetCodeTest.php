<?php

namespace Tests\Feature\Buyer\Auth;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\BuyerPasswordResetCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PasswordResetCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_verify_a_code_reset_the_password_and_log_in(): void
    {
        $buyer = User::factory()->create([
            'email' => 'reset-buyer@example.test',
            'password' => Hash::make('OldPassword!123'),
        ]);

        BuyerPasswordResetCode::create([
            'user_id' => $buyer->id,
            'email' => $buyer->email,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
        ]);

        $token = $this->postJson('/api/buyer/auth/verify-reset-code', [
            'email' => $buyer->email,
            'code' => '123456',
        ])->assertOk()->json('data.reset_token');

        $this->assertIsString($token);
        $this->assertNotSame('', $token);

        $this->postJson('/api/buyer/auth/reset-password', [
            'email' => $buyer->email,
            'reset_token' => $token,
            'password' => 'NewPassword!123',
            'password_confirmation' => 'NewPassword!123',
        ])->assertOk();

        $buyer->refresh();
        $this->assertTrue(Hash::check('NewPassword!123', $buyer->password));
        $this->assertDatabaseMissing('buyer_password_reset_codes', ['user_id' => $buyer->id]);

        $this->postJson('/api/buyer/auth/login', [
            'email' => $buyer->email,
            'password' => 'NewPassword!123',
        ])->assertOk();
    }

    public function test_forgot_password_emails_a_code_to_a_registered_buyer(): void
    {
        Mail::fake();

        $buyer = User::factory()->create();

        $this->postJson('/api/buyer/auth/forgot-password', ['email' => $buyer->email])
            ->assertOk()
            ->assertJsonPath('message', 'If that email belongs to an account, a verification code has been sent.');

        Mail::assertSent(MarketplaceTransactionalMail::class, 1);
        $this->assertDatabaseHas('buyer_password_reset_codes', ['user_id' => $buyer->id]);
    }

    public function test_forgot_password_does_not_disclose_unknown_or_non_buyer_emails(): void
    {
        Mail::fake();

        $seller = User::factory()->seller()->create(['email' => 'seller-reset@example.test']);

        $this->postJson('/api/buyer/auth/forgot-password', ['email' => 'nobody@example.test'])->assertOk();
        $this->postJson('/api/buyer/auth/forgot-password', ['email' => $seller->email])->assertOk();

        Mail::assertNothingSent();
        $this->assertDatabaseCount('buyer_password_reset_codes', 0);
    }

    public function test_invalid_or_expired_code_cannot_open_a_reset_session(): void
    {
        $buyer = User::factory()->create();

        BuyerPasswordResetCode::create([
            'user_id' => $buyer->id,
            'email' => $buyer->email,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/buyer/auth/verify-reset-code', [
            'email' => $buyer->email,
            'code' => '123456',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.code.0', 'This verification code has expired. Request a new code and try again.');
    }

    public function test_incorrect_code_reports_remaining_attempts(): void
    {
        $buyer = User::factory()->create();

        BuyerPasswordResetCode::create([
            'user_id' => $buyer->id,
            'email' => $buyer->email,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->postJson('/api/buyer/auth/verify-reset-code', [
            'email' => $buyer->email,
            'code' => '000000',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.code.0', 'The verification code is incorrect. 4 attempts remaining.');

        $this->assertDatabaseHas('buyer_password_reset_codes', [
            'user_id' => $buyer->id,
            'attempts' => 1,
        ]);
    }

    public function test_repeated_wrong_codes_lock_the_challenge_out(): void
    {
        $buyer = User::factory()->create();

        BuyerPasswordResetCode::create([
            'user_id' => $buyer->id,
            'email' => $buyer->email,
            'code' => Hash::make('123456'),
            'attempts' => 4,
            'expires_at' => now()->addMinutes(10),
        ]);

        // Fifth and final attempt burns the challenge.
        $this->postJson('/api/buyer/auth/verify-reset-code', [
            'email' => $buyer->email,
            'code' => '000000',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.code.0', 'Too many incorrect code attempts. Request a new code and try again.');

        $this->assertDatabaseHas('buyer_password_reset_codes', [
            'user_id' => $buyer->id,
            'attempts' => 5,
        ]);

        // Even the correct code is now refused.
        $this->postJson('/api/buyer/auth/verify-reset-code', [
            'email' => $buyer->email,
            'code' => '123456',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.code.0', 'Too many incorrect code attempts. Request a new code and try again.');
    }

    public function test_reset_token_is_single_use(): void
    {
        $buyer = User::factory()->create();

        BuyerPasswordResetCode::create([
            'user_id' => $buyer->id,
            'email' => $buyer->email,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
            'reset_token' => Hash::make('known-token'),
            'reset_token_expires_at' => now()->addMinutes(10),
        ]);

        $payload = [
            'email' => $buyer->email,
            'reset_token' => 'known-token',
            'password' => 'NewPassword!123',
            'password_confirmation' => 'NewPassword!123',
        ];

        $this->postJson('/api/buyer/auth/reset-password', $payload)->assertOk();

        $this->postJson('/api/buyer/auth/reset-password', $payload)->assertUnprocessable();
    }

    public function test_reset_requires_a_confirmed_code(): void
    {
        $buyer = User::factory()->create(['password' => Hash::make('OldPassword!123')]);

        BuyerPasswordResetCode::create([
            'user_id' => $buyer->id,
            'email' => $buyer->email,
            'code' => Hash::make('123456'),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->postJson('/api/buyer/auth/reset-password', [
            'email' => $buyer->email,
            'reset_token' => 'never-verified',
            'password' => 'NewPassword!123',
            'password_confirmation' => 'NewPassword!123',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.code.0', 'Your verified reset session has expired. Request a new code and try again.');

        $this->assertTrue(Hash::check('OldPassword!123', $buyer->refresh()->password));
    }
}