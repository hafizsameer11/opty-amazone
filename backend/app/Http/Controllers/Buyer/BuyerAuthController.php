<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Buyer\Auth\ForgotPasswordRequest;
use App\Http\Requests\Buyer\Auth\LoginRequest;
use App\Http\Requests\Buyer\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use App\Services\Auth\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Tag(
 *     name="Buyer Auth",
 *     description="Buyer authentication endpoints"
 * )
 */
class BuyerAuthController extends Controller
{
    public function __construct(
        private AuthService $authService,
        private PasswordResetService $passwordResetService
    ) {}

    /**
     * @OA\Post(
     *     path="/api/buyer/auth/register",
     *     summary="Register a new buyer",
     *     tags={"Buyer Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "email", "password", "password_confirmation"},
     *             @OA\Property(property="name", type="string", example="John Doe"),
     *             @OA\Property(property="email", type="string", format="email", example="buyer@example.com"),
     *             @OA\Property(property="phone", type="string", example="+1234567890"),
     *             @OA\Property(property="password", type="string", format="password", example="password123"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="password123")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="User registered successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Registration successful"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="user", ref="#/components/schemas/User"),
     *                 @OA\Property(property="token", type="string", example="1|xxxxxxxxxxxx")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->register($request->validated(), 'buyer');
            
            $token = $user->createToken('buyer_token', ['buyer'])->plainTextToken;

            return ResponseHelper::success(
                [
                    'user' => new UserResource($user),
                    'token' => $token,
                ],
                'Registration successful',
                201
            );
        } catch (\Exception $e) {
            Log::error('Buyer registration failed: ' . $e->getMessage(), [
                'email' => $request->email ?? null,
            ]);
            
            return ResponseHelper::error(
                'Registration failed. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * @OA\Post(
     *     path="/api/buyer/auth/login",
     *     summary="Login buyer",
     *     tags={"Buyer Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email", "password"},
     *             @OA\Property(property="email", type="string", format="email", example="buyer@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="password123")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Login successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Login successful"),
     *             @OA\Property(property="data", type="object",
     *                 @OA\Property(property="user", ref="#/components/schemas/User"),
     *                 @OA\Property(property="token", type="string", example="1|xxxxxxxxxxxx")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Invalid credentials"
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login(
                $request->email,
                $request->password,
                'buyer'
            );

            return ResponseHelper::success(
                [
                    'user' => new UserResource($result['user']),
                    'token' => $result['token'],
                ],
                'Login successful'
            );
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            Log::error('Buyer login failed: ' . $e->getMessage(), [
                'email' => $request->email ?? null,
            ]);
            
            return ResponseHelper::error(
                'Login failed. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * @OA\Post(
     *     path="/api/buyer/auth/logout",
     *     summary="Logout buyer",
     *     tags={"Buyer Auth"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Logout successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Logged out successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthenticated"
     *     )
     * )
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $this->authService->logout($request->user());

            return ResponseHelper::success(null, 'Logged out successfully');
        } catch (\Exception $e) {
            Log::error('Buyer logout failed: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? null,
            ]);
            
            return ResponseHelper::error(
                'Logout failed. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * @OA\Post(
     *     path="/api/buyer/auth/forgot-password",
     *     summary="Request password reset",
     *     tags={"Buyer Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email"},
     *             @OA\Property(property="email", type="string", format="email", example="buyer@example.com")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Password reset link sent",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Password reset link sent to your email")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error"
     *     )
     * )
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $this->passwordResetService->sendResetLink($request->email, 'buyer');

            return ResponseHelper::success(
                null,
                'Password reset link sent to your email'
            );
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            Log::error('Buyer forgot password failed: ' . $e->getMessage(), [
                'email' => $request->email ?? null,
            ]);
            
            return ResponseHelper::error(
                'Failed to send password reset link. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * @OA\Post(
     *     path="/api/buyer/auth/reset-password",
     *     summary="Reset password",
     *     tags={"Buyer Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email", "password", "password_confirmation", "token"},
     *             @OA\Property(property="email", type="string", format="email", example="buyer@example.com"),
     *             @OA\Property(property="password", type="string", format="password", example="newpassword123"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="newpassword123"),
     *             @OA\Property(property="token", type="string", example="reset-token-here")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Password reset successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Password reset successful")
     *         )
     *     ),
     *     @OA\Response(
     *         response=422,
     *         description="Validation error or invalid token"
     *     )
     * )
     */
    public function resetPassword(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'token' => ['required'],
                'email' => ['required', 'email'],
                'password' => ['required', 'confirmed', Password::defaults()],
            ]);

            $this->passwordResetService->resetPassword($request->only(
                'email',
                'password',
                'password_confirmation',
                'token'
            ));

            return ResponseHelper::success(null, 'Password reset successful');
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            Log::error('Buyer password reset failed: ' . $e->getMessage(), [
                'email' => $request->email ?? null,
            ]);
            
            return ResponseHelper::error(
                'Password reset failed. Please try again.',
                null,
                500
            );
        }
    }
}
