<?php

namespace Tests\Feature\Seller\Auth;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\EmailVerificationChallenge;
use App\Models\User;
use App\Services\Email\EmailVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_a_code_and_verification_marks_the_seller_as_verified(): void
    {
        Mail::fake();
        $this->postJson('/api/seller/auth/register', [
            'name' => 'Verified Seller', 'email' => 'seller@example.test', 'phone' => '+391234567890',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ])->assertCreated()->assertJsonPath('data.email_verification_required', true);

        $seller = User::where('email', 'seller@example.test')->firstOrFail();
        $challenge = EmailVerificationChallenge::where('user_id', $seller->id)
            ->where('purpose', EmailVerificationService::PURPOSE_SELLER)
            ->firstOrFail();
        $code = null;
        Mail::assertSent(MarketplaceTransactionalMail::class, function (MarketplaceTransactionalMail $mail) use (&$code, $challenge): bool {
            if ($mail->heading !== 'Verifica il tuo indirizzo email') return false;
            $code = $mail->code;
            return is_string($code) && Hash::check($code, $challenge->code_hash);
        });

        Sanctum::actingAs($seller, ['seller']);
        $this->postJson('/api/seller/profile/verify-email', ['code' => $code])
            ->assertOk()->assertJsonPath('data.user.email', 'seller@example.test');

        $this->assertNotNull($seller->fresh()->email_verified_at);
        $this->assertNotNull($challenge->fresh()->verified_at);
        Mail::assertSent(MarketplaceTransactionalMail::class, fn (MarketplaceTransactionalMail $mail) => $mail->heading === 'Email verificata');
    }

    public function test_verification_requires_a_code_and_rejects_incorrect_ones(): void
    {
        Mail::fake();
        $seller = User::factory()->unverified()->create(['role' => 'seller']);
        EmailVerificationChallenge::create([
            'user_id' => $seller->id, 'purpose' => EmailVerificationService::PURPOSE_SELLER,
            'code_hash' => Hash::make('123456'), 'expires_at' => now()->addMinutes(15), 'sent_at' => now(),
        ]);

        Sanctum::actingAs($seller, ['seller']);
        $this->postJson('/api/seller/profile/verify-email', [])->assertStatus(422)->assertJsonValidationErrors('code');
        $this->assertNull($seller->fresh()->email_verified_at);

        $this->postJson('/api/seller/profile/verify-email', ['code' => '654321'])
            ->assertStatus(422)->assertJsonValidationErrors('code');
        $this->assertNull($seller->fresh()->email_verified_at);
    }

    public function test_verification_rejects_expired_codes(): void
    {
        Mail::fake();
        $seller = User::factory()->unverified()->create(['role' => 'seller']);
        $challenge = EmailVerificationChallenge::create([
            'user_id' => $seller->id, 'purpose' => EmailVerificationService::PURPOSE_SELLER,
            'code_hash' => Hash::make('123456'), 'expires_at' => now()->subMinute(), 'sent_at' => now()->subMinutes(16),
        ]);

        Sanctum::actingAs($seller, ['seller']);
        $this->postJson('/api/seller/profile/verify-email', ['code' => '123456'])
            ->assertStatus(422)->assertJsonValidationErrors('code');
        $this->assertNull($challenge->fresh()->verified_at);
    }

    public function test_login_reports_verification_still_required_for_unverified_sellers(): void
    {
        Mail::fake();
        $seller = User::factory()->unverified()->create([
            'role' => 'seller', 'email' => 'pending@example.test', 'password' => Hash::make('password123'),
        ]);

        $this->postJson('/api/seller/auth/login', ['email' => 'pending@example.test', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('data.email_verification_required', true);
    }

    public function test_seller_and_buyer_challenges_do_not_collide(): void
    {
        Mail::fake();
        $seller = User::factory()->unverified()->create(['role' => 'seller']);
        $sellerChallenge = EmailVerificationChallenge::create([
            'user_id' => $seller->id, 'purpose' => EmailVerificationService::PURPOSE_SELLER,
            'code_hash' => Hash::make('111111'), 'expires_at' => now()->addMinutes(15), 'sent_at' => now(),
        ]);
        $buyerChallenge = EmailVerificationChallenge::create([
            'user_id' => $seller->id, 'purpose' => EmailVerificationService::PURPOSE_BUYER,
            'code_hash' => Hash::make('222222'), 'expires_at' => now()->addMinutes(15), 'sent_at' => now(),
        ]);

        Sanctum::actingAs($seller, ['seller']);
        $this->postJson('/api/seller/profile/verify-email', ['code' => '111111'])->assertOk();
        $this->assertNotNull($sellerChallenge->fresh()->verified_at);
        $this->assertNull($buyerChallenge->fresh()->verified_at);
    }
}