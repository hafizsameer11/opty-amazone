<?php

namespace App\Services\User;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class UserService
{
    /**
     * Get the authenticated user's profile.
     */
    public function getProfile(User $user): User
    {
        return $user->fresh();
    }

    /**
     * Update the authenticated user's profile.
     */
    public function updateProfile(User $user, array $data): User
    {
        try {
            $user->fill($data);
            $user->save();

            return $user->fresh();
        } catch (\Exception $e) {
            Log::error('Profile update failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match your current password.'],
            ]);
        }

        $user->password = Hash::make($newPassword);
        $user->save();
    }

    /**
     * Upload and attach a profile image to the user.
     */
    public function uploadProfileImage(User $user, UploadedFile $file): User
    {
        try {
            // Delete existing image if present
            if ($user->profile_image) {
                Storage::disk('public')->delete($user->profile_image);
            }

            $path = $file->store('profiles/' . $user->id, 'public');

            $user->profile_image = $path;
            $user->save();

            return $user->fresh();
        } catch (\Exception $e) {
            Log::error('Profile image upload failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Delete the user's profile image.
     */
    public function deleteProfileImage(User $user): User
    {
        try {
            if ($user->profile_image) {
                Storage::disk('public')->delete($user->profile_image);
                $user->profile_image = null;
                $user->save();
            }

            return $user->fresh();
        } catch (\Exception $e) {
            Log::error('Profile image delete failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Placeholder for sending email verification.
     * In a full implementation this would dispatch a notification with a signed URL.
     */
    public function sendEmailVerification(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            return;
        }

        $user->sendEmailVerificationNotification();
    }

    /**
     * Verify the user's email.
     *
     * In a typical Laravel app this is handled via signed URLs; here we assume
     * that verification has already been validated at the controller level.
     */
    public function verifyEmail(User $user): void
    {
        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }
    }

    /**
     * Placeholder for sending phone verification (OTP).
     *
     * This can be wired to an SMS provider; for now we only log the action.
     */
    public function sendPhoneVerification(User $user): void
    {
        Log::info('Phone verification requested', [
            'user_id' => $user->id,
            'phone' => $user->phone,
        ]);
    }

    /**
     * Mark phone as verified.
     *
     * OTP validation should happen before calling this method.
     */
    public function verifyPhone(User $user): void
    {
        if (!$user->phone_verified_at) {
            $user->phone_verified_at = now();
            $user->save();
        }
    }

    /**
     * Delete (soft delete) the authenticated user's account.
     */
    public function deleteAccount(User $user, string $password): void
    {
        if (!Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['The provided password is incorrect.'],
            ]);
        }

        $user->tokens()->delete();
        $user->delete();
    }
}

