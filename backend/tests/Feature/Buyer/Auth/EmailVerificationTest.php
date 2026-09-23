<?php

namespace Tests\Feature\Buyer\Auth;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\EmailVerificationChallenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_a_code_and_verification_marks_the_buyer_as_verified(): void
    {
        Mail::fake();
        $this->postJson('/api/buyer/auth/register', [
            'name' => 'Verified Buyer', 'email' => 'verify@example.test', 'phone' => '+391234567890',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ])->assertCreated()->assertJsonPath('data.email_verification_required', true);

        $buyer = User::where('email', 'verify@example.test')->firstOrFail();
        $challenge = EmailVerificationChallenge::where('user_id', $buyer->id)->firstOrFail();
        $code = null;
        Mail::assertSent(MarketplaceTransactionalMail::class, function (MarketplaceTransactionalMail $mail) use (&$code, $challenge): bool {
            if ($mail->heading !== 'Verify your email address') return false;
            $code = $mail->code;
            return is_string($code) && Hash::check($code, $challenge->code_hash);
        });

        Sanctum::actingAs($buyer, ['buyer']);
        $this->postJson('/api/buyer/profile/verify-email', ['code' => $code])
            ->assertOk()->assertJsonPath('data.user.email', 'verify@example.test');

        $this->assertNotNull($buyer->fresh()->email_verified_at);
        $this->assertNotNull($challenge->fresh()->verified_at);
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Welcome to VistaExpress');
    }

    public function test_verification_rejects_expired_and_incorrect_codes(): void
    {
        Mail::fake();
        $buyer = User::factory()->unverified()->create(['role' => 'buyer']);
        $challenge = EmailVerificationChallenge::create([
            'user_id' => $buyer->id, 'purpose' => 'buyer_registration', 'code_hash' => Hash::make('123456'),
            'expires_at' => now()->subMinute(), 'sent_at' => now()->subMinutes(16),
        ]);
        Sanctum::actingAs($buyer, ['buyer']);
        $this->postJson('/api/buyer/profile/verify-email', ['code' => '123456'])->assertStatus(422)->assertJsonValidationErrors('code');

        $challenge->update(['expires_at' => now()->addMinutes(15), 'attempts' => 0]);
        $this->postJson('/api/buyer/profile/verify-email', ['code' => '654321'])->assertStatus(422)->assertJsonValidationErrors('code');
        $this->assertSame(1, (int) $challenge->fresh()->attempts);
    }
}
