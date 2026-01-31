<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class TokenService
{
    /**
     * Create a new token for user
     */
    public function createToken(User $user, string $role): string
    {
        try {
            $tokenName = $role . '_token';
            $abilities = [$role];
            
            if ($role === 'admin') {
                $abilities[] = 'buyer';
                $abilities[] = 'seller';
            }

            $token = $user->createToken($tokenName, $abilities);

            return $token->plainTextToken;
        } catch (\Exception $e) {
            Log::error('Token creation failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'role' => $role,
            ]);
            throw $e;
        }
    }

    /**
     * Revoke token
     */
    public function revokeToken(string $token): bool
    {
        try {
            $accessToken = PersonalAccessToken::findToken($token);
            
            if ($accessToken) {
                return $accessToken->delete();
            }

            return false;
        } catch (\Exception $e) {
            Log::error('Token revocation failed: ' . $e->getMessage());
            throw $e;
        }
    }
}
