<?php

namespace Tests\Feature\Seller\Auth;

use App\Mail\MarketplaceTransactionalMail;
use App\Models\EmailVerificationChallenge;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PasswordChangeVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_must_verify_an_emailed_code_before_changing_a_password(): void
    {
        Mail::fake();
        $seller = User::factory()->create(['role' => 'seller', 'password' => Hash::make('old-password')]);
        Sanctum::actingAs($seller, ['seller']);

        $this->postJson('/api/seller/profile/change-password/reset', [
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])->assertStatus(422)->assertJsonValidationErrors('code');

        $this->postJson('/api/seller/profile/change-password/send-code')
            ->assertOk()->assertJsonPath('data.email', $seller->email);

        $challenge = EmailVerificationChallenge::where('user_id', $seller->id)
            ->where('purpose', 'seller_password_change')->firstOrFail();
        $code = null;
        Mail::assertSent(MarketplaceTransactionalMail::class, function (MarketplaceTransactionalMail $mail) use (&$code, $challenge): bool {
            if ($mail->heading !== 'Conferma il cambio password') {
                return false;
            }

            $code = $mail->code;

            return is_string($code) && Hash::check($code, $challenge->code_hash);
        });

        $this->postJson('/api/seller/profile/change-password/verify-code', ['code' => $code])->assertOk();
        $this->postJson('/api/seller/profile/change-password/reset', [
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password123', $seller->fresh()->password));
        $this->assertDatabaseMissing('email_verification_challenges', [
            'user_id' => $seller->id,
            'purpose' => 'seller_password_change',
        ]);
    }
}
