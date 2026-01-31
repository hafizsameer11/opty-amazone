<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(
        private TokenService $tokenService
    ) {}

    /**
     * Register a new user
     */
    public function register(array $data, string $role = 'buyer'): User
    {
        try {
            $data['role'] = $role;
            $data['password'] = Hash::make($data['password']);
            
            return User::create($data);
        } catch (\Exception $e) {
            Log::error('Registration failed: ' . $e->getMessage(), [
                'email' => $data['email'] ?? null,
                'role' => $role,
            ]);
            throw $e;
        }
    }

    /**
     * Authenticate user and generate token
     */
    public function login(string $email, string $password, string $role): array
    {
        try {
            $user = User::where('email', $email)->first();

            if (!$user || !Hash::check($password, $user->password)) {
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            // Check if user has the correct role
            if ($user->role !== $role) {
                throw ValidationException::withMessages([
                    'email' => ['Invalid credentials for this account type.'],
                ]);
            }

            // Revoke all existing tokens
            $user->tokens()->delete();

            // Create new token
            $token = $this->tokenService->createToken($user, $role);

            return [
                'user' => $user,
                'token' => $token,
            ];
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Login failed: ' . $e->getMessage(), [
                'email' => $email,
                'role' => $role,
            ]);
            throw ValidationException::withMessages([
                'email' => ['An error occurred during login. Please try again.'],
            ]);
        }
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(User $user): bool
    {
        try {
            // Delete the current access token
            $token = $user->currentAccessToken();
            if ($token instanceof \Laravel\Sanctum\PersonalAccessToken) {
                return $token->delete();
            }
            return false;
        } catch (\Exception $e) {
            Log::error('Logout failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);
            throw $e;
        }
    }

    /**
     * Logout from all devices
     */
    public function logoutAll(User $user): bool
    {
        try {
            return $user->tokens()->delete() > 0;
        } catch (\Exception $e) {
            Log::error('Logout all failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);
            throw $e;
        }
    }
}
