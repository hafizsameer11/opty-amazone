<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class PasswordResetService
{
    /**
     * Send password reset link
     */
    public function sendResetLink(string $email, string $role): string
    {
        try {
            $user = User::where('email', $email)->first();

            if (!$user || $user->role !== $role) {
                // Don't reveal if user exists
                return Password::RESET_LINK_SENT;
            }

            $status = Password::sendResetLink(
                ['email' => $email]
            );

            if ($status !== Password::RESET_LINK_SENT) {
                throw ValidationException::withMessages([
                    'email' => [__($status)],
                ]);
            }

            return $status;
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Password reset link sending failed: ' . $e->getMessage(), [
                'email' => $email,
                'role' => $role,
            ]);
            throw ValidationException::withMessages([
                'email' => ['An error occurred. Please try again later.'],
            ]);
        }
    }

    /**
     * Reset password
     */
    public function resetPassword(array $credentials): string
    {
        try {
            $status = Password::reset(
                $credentials,
                function ($user, $password) {
                    $user->update([
                        'password' => Hash::make($password)
                    ]);
                }
            );

            if ($status !== Password::PASSWORD_RESET) {
                throw ValidationException::withMessages([
                    'email' => [__($status)],
                ]);
            }

            return $status;
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Password reset failed: ' . $e->getMessage(), [
                'email' => $credentials['email'] ?? null,
            ]);
            throw ValidationException::withMessages([
                'email' => ['An error occurred during password reset. Please try again.'],
            ]);
        }
    }
}
