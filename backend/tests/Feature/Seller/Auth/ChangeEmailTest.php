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

/**
 * The login email is the account identifier, so it may only be corrected while
 * it is still unverified. These tests pin that boundary down.
 */
class ChangeEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_unverified_seller_can_change_the_email_and_receives_a_new_code(): void
    {
        Mail::fake();
        $seller = User::factory()->unverified()->create([
            'role' => 'seller', 'email' => 'typo@shop.com',
        ]);

        Sanctum::actingAs($seller, ['seller']);

        $this->postJson('/api/seller/profile/change-email', ['email' => 'correct@shop.com'])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'correct@shop.com')
            ->assertJsonPath('data.verification_dispatched', true);

        $fresh = $seller->fresh();
        $this->assertSame('correct@shop.com', $fresh->email);
        // Changing the address must reset verification.
        $this->assertNull($fresh->email_verified_at);

        $challenge = EmailVerificationChallenge::where('user_id', $seller->id)
            ->where('purpose', EmailVerificationService::PURPOSE_SELLER)
            ->firstOrFail();
        Mail::assertSent(MarketplaceTransactionalMail::class, function (MarketplaceTransactionalMail $mail) use ($challenge): bool {
            return $mail->heading === 'Verifica il tuo indirizzo email'
                && is_string($mail->code)
                && Hash::check($mail->code, $challenge->code_hash);
        });
    }

    public function test_changing_email_works_even_within_the_resend_cooldown(): void
    {
        Mail::fake();
        $seller = User::factory()->unverified()->create(['role' => 'seller']);

        // A code issued moments ago for the previous address.
        EmailVerificationChallenge::create([
            'user_id' => $seller->id, 'purpose' => EmailVerificationService::PURPOSE_SELLER,
            'code_hash' => Hash::make('123456'), 'sent_at' => now(), 'expires_at' => now()->addMinutes(15),
        ]);

        Sanctum::actingAs($seller, ['seller']);

        $this->postJson('/api/seller/profile/change-email', ['email' => 'new@shop.com'])
            ->assertOk()
            ->assertJsonPath('data.verification_dispatched', true);
    }

    public function test_verified_seller_cannot_change_the_email(): void
    {
        Mail::fake();
        $seller = User::factory()->create(['role' => 'seller', 'email' => 'verified@shop.com']);
        $this->assertNotNull($seller->email_verified_at);

        Sanctum::actingAs($seller, ['seller']);

        $this->postJson('/api/seller/profile/change-email', ['email' => 'hijack@evil.com'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertSame('verified@shop.com', $seller->fresh()->email);
    }

    public function test_email_must_be_unique_and_valid(): void
    {
        Mail::fake();
        $seller = User::factory()->unverified()->create(['role' => 'seller', 'email' => 'me@shop.com']);
        User::factory()->create(['role' => 'buyer', 'email' => 'taken@shop.com']);

        Sanctum::actingAs($seller, ['seller']);

        $this->postJson('/api/seller/profile/change-email', ['email' => 'not-an-email'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
        $this->postJson('/api/seller/profile/change-email', ['email' => 'taken@shop.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->assertSame('me@shop.com', $seller->fresh()->email);
    }

    public function test_buyer_cannot_use_the_seller_endpoint(): void
    {
        Mail::fake();
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'buyer@example.com']);

        Sanctum::actingAs($buyer, ['buyer']);

        $this->postJson('/api/seller/profile/change-email', ['email' => 'new@example.com'])
            ->assertForbidden();

        $this->assertSame('buyer@example.com', $buyer->fresh()->email);
    }
}