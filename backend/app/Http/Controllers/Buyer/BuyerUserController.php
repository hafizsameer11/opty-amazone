<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Buyer\User\ChangePasswordRequest;
use App\Http\Requests\Buyer\User\DeleteAccountRequest;
use App\Http\Requests\Buyer\User\UpdateProfileRequest;
use App\Http\Requests\Buyer\User\UploadImageRequest;
use App\Http\Resources\UserResource;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Tag(
 *     name="Buyer User",
 *     description="Buyer profile & account management"
 * )
 */
class BuyerUserController extends Controller
{
    public function __construct(
        private UserService $userService,
    ) {
    }

    /**
     * Get the authenticated buyer profile.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = $this->userService->getProfile($request->user());

        return ResponseHelper::success([
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Update the authenticated buyer profile.
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        try {
            $user = $this->userService->updateProfile($request->user(), $request->validated());

            return ResponseHelper::success([
                'user' => new UserResource($user),
            ], 'Profile updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update profile');
        }
    }

    /**
     * Change the authenticated buyer password.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        try {
            $this->userService->changePassword(
                $request->user(),
                $request->input('current_password'),
                $request->input('password')
            );

            return ResponseHelper::success(null, 'Password updated successfully');
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update password');
        }
    }

    /**
     * Upload a profile image for the authenticated buyer.
     */
    public function uploadProfileImage(UploadImageRequest $request): JsonResponse
    {
        try {
            $user = $this->userService->uploadProfileImage(
                $request->user(),
                $request->file('image')
            );

            return ResponseHelper::success([
                'user' => new UserResource($user),
            ], 'Profile image updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to upload profile image');
        }
    }

    /**
     * Delete the profile image for the authenticated buyer.
     */
    public function deleteProfileImage(Request $request): JsonResponse
    {
        try {
            $user = $this->userService->deleteProfileImage($request->user());

            return ResponseHelper::success([
                'user' => new UserResource($user),
            ], 'Profile image removed successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to delete profile image');
        }
    }

    /**
     * Send email verification to the authenticated buyer.
     */
    public function sendEmailVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return ResponseHelper::success(null, 'Email already verified');
        }

        $this->userService->sendEmailVerification($user);

        return ResponseHelper::success(null, 'Verification email sent');
    }

    /**
     * Mark email as verified for the authenticated buyer.
     *
     * In a real application this would be called via a signed URL.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $this->userService->verifyEmail($request->user());

        return ResponseHelper::success(null, 'Email verified successfully');
    }

    /**
     * Send phone verification (OTP) to the authenticated buyer.
     */
    public function sendPhoneVerification(Request $request): JsonResponse
    {
        $this->userService->sendPhoneVerification($request->user());

        return ResponseHelper::success(null, 'Phone verification initiated');
    }

    /**
     * Mark phone as verified for the authenticated buyer.
     *
     * OTP validation should be implemented separately.
     */
    public function verifyPhone(Request $request): JsonResponse
    {
        $this->userService->verifyPhone($request->user());

        return ResponseHelper::success(null, 'Phone verified successfully');
    }

    /**
     * Delete the authenticated buyer account.
     */
    public function deleteAccount(DeleteAccountRequest $request): JsonResponse
    {
        try {
            $this->userService->deleteAccount(
                $request->user(),
                $request->input('password')
            );

            return ResponseHelper::success(null, 'Account deleted successfully');
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to delete account');
        }
    }
}

