<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\User\ChangeEmailRequest;
use App\Http\Requests\Seller\User\ChangePasswordRequest;
use App\Http\Requests\Seller\User\DeleteAccountRequest;
use App\Http\Requests\Seller\User\UpdateProfileRequest;
use App\Http\Requests\Seller\User\UploadImageRequest;
use App\Http\Resources\UserResource;
use App\Models\EmailVerificationChallenge;
use App\Services\Email\EmailVerificationService;
use App\Services\Email\PasswordChangeVerificationService;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Tag(
 *     name="Seller User",
 *     description="Seller profile & account management"
 * )
 */
class SellerUserController extends Controller
{
    public function __construct(
        private UserService $userService,
        private PasswordChangeVerificationService $passwordChangeVerification,
        private EmailVerificationService $emailVerification,
    ) {
    }

    /**
     * Get the authenticated seller profile.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $user = $this->userService->getProfile($request->user());

        return ResponseHelper::success([
            'user' => new UserResource($user),
        ]);
    }

    /**
     * Update the authenticated seller profile.
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
     * Change the authenticated seller password.
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

    /** Send a one-time password-change code to the authenticated seller's email. */
    public function sendPasswordChangeCode(Request $request): JsonResponse
    {
        try {
            $this->passwordChangeVerification->send($request->user());

            return ResponseHelper::success([
                'email' => $request->user()->email,
            ], 'Verification code sent to your registered email');
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Throwable $e) {
            report($e);

            return ResponseHelper::serverError('We could not send a verification code. Please try again.');
        }
    }

    /** Verify a seller's password-change code before accepting a new password. */
    public function verifyPasswordChangeCode(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'regex:/^\d{6}$/D']]);

        try {
            $this->passwordChangeVerification->verify($request->user(), $data['code']);

            return ResponseHelper::success(null, 'Code verified. You can now choose a new password.');
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        }
    }

    /** Complete an authenticated seller password change after code verification. */
    public function resetPasswordWithVerifiedCode(Request $request): JsonResponse
    {
        $data = $request->validate(['password' => ['required', 'string', 'confirmed', 'min:8']]);

        try {
            $this->passwordChangeVerification->consume($request->user());
            $this->userService->changePasswordWithVerifiedEmailCode($request->user(), $data['password']);

            return ResponseHelper::success(null, 'Password updated successfully');
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Throwable $e) {
            report($e);

            return ResponseHelper::serverError('Failed to update password');
        }
    }

    /**
     * Upload a profile image for the authenticated seller.
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
     * Delete the profile image for the authenticated seller.
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
     * Send the time-limited email verification code to the authenticated seller.
     */
    public function sendEmailVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return ResponseHelper::success(null, 'Email already verified');
        }

        try {
            $this->emailVerification->send($user, EmailVerificationService::PURPOSE_SELLER);
        } catch (ValidationException $exception) {
            return ResponseHelper::validationError($exception->errors());
        } catch (\Throwable $exception) {
            report($exception);

            return ResponseHelper::serverError('We could not send a verification email. Please try again.');
        }

        return ResponseHelper::success(null, 'Verification email sent');
    }

    /**
     * Change the login email address while it is still unverified.
     *
     * The address is the account identifier, so this is deliberately limited to
     * accounts that have not yet proven one; ChangeEmailRequest rejects the call
     * once the address is verified. Any live challenge is discarded so the new
     * address gets its own code straight away instead of waiting out the resend
     * cooldown that the previous address used.
     */
    public function changeEmail(ChangeEmailRequest $request): JsonResponse
    {
        $user = $request->user();
        $email = trim((string) $request->validated()['email']);

        EmailVerificationChallenge::where('user_id', $user->id)
            ->where('purpose', EmailVerificationService::PURPOSE_SELLER)
            ->delete();

        $user->forceFill(['email' => $email, 'email_verified_at' => null])->save();
        $user = $user->fresh();

        // The address change is durable even if the mail send fails, so the
        // seller can still request a fresh code from the verification screen.
        $dispatched = true;
        try {
            $this->emailVerification->send($user, EmailVerificationService::PURPOSE_SELLER);
        } catch (\Throwable $exception) {
            report($exception);
            $dispatched = false;
        }

        return ResponseHelper::success([
            'user' => new UserResource($user),
            'verification_dispatched' => $dispatched,
        ], $dispatched
            ? 'Email address updated. A new verification code has been sent.'
            : 'Email address updated. Request a verification code from the verification screen.');
    }

    /**
     * Verify the time-limited code sent to the authenticated seller.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'regex:/^\d{6}$/D']]);
        $user = $this->emailVerification->verify($request->user(), $data['code'], EmailVerificationService::PURPOSE_SELLER);

        return ResponseHelper::success(['user' => new UserResource($user)], 'Email verified successfully');
    }

    /**
     * Send phone verification (OTP) to the authenticated seller.
     */
    public function sendPhoneVerification(Request $request): JsonResponse
    {
        $this->userService->sendPhoneVerification($request->user());

        return ResponseHelper::success(null, 'Phone verification initiated');
    }

    /**
     * Mark phone as verified for the authenticated seller.
     */
    public function verifyPhone(Request $request): JsonResponse
    {
        $this->userService->verifyPhone($request->user());

        return ResponseHelper::success(null, 'Phone verified successfully');
    }

    /**
     * Delete the authenticated seller account.
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

