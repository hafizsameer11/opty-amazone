<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\Auth\ForgotPasswordRequest;
use App\Http\Requests\Seller\Auth\LoginRequest;
use App\Http\Requests\Seller\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use App\Services\Auth\PasswordResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Tag(
 *     name="Seller Auth",
 *     description="Seller authentication endpoints"
 * )
 */
class SellerAuthController extends Controller
{
    public function __construct(
        private AuthService $authService,
        private PasswordResetService $passwordResetService
    ) {}

    /**
     * @OA\Post(
     *     path="/api/seller/auth/register",
     *     summary="Register a new seller",
     *     tags={"Seller Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name", "email", "password", "password_confirmation"},
     *             @OA\Property(property="name", type="string", example="Seller Name"),
     *             @OA\Property(property="email", type="string", format="email", example="seller@example.com"),
     *             @OA\Property(property="phone", type="string", example="+1234567890"),
     *             @OA\Property(property="password", type="string", format="password", example="password123"),
     *             @OA\Property(property="password_confirmation", type="string", format="password", example="password123")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Seller registered successfully",
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
            $user = $this->authService->register($request->validated(), 'seller');
            
            $token = $user->createToken('seller_token', ['seller'])->plainTextToken;

            return ResponseHelper::success(
                [
                    'user' => new UserResource($user),
                    'token' => $token,
                ],
                'Registration successful',
                201
            );
        } catch (\Exception $e) {
            Log::error('Seller registration failed: ' . $e->getMessage(), [
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
     *     path="/api/seller/auth/login",
     *     summary="Login seller",
     *     tags={"Seller Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email", "password"},
     *             @OA\Property(property="email", type="string", format="email", example="seller@example.com"),
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
     *     )
     * )
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->authService->login(
                $request->email,
                $request->password,
                'seller'
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
            Log::error('Seller login failed: ' . $e->getMessage(), [
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
     *     path="/api/seller/auth/logout",
     *     summary="Logout seller",
     *     tags={"Seller Auth"},
     *     security={{"sanctum": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="Logout successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Logged out successfully")
     *         )
     *     )
     * )
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $this->authService->logout($request->user());

            return ResponseHelper::success(null, 'Logged out successfully');
        } catch (\Exception $e) {
            Log::error('Seller logout failed: ' . $e->getMessage(), [
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
     *     path="/api/seller/auth/forgot-password",
     *     summary="Request password reset",
     *     tags={"Seller Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email"},
     *             @OA\Property(property="email", type="string", format="email", example="seller@example.com")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Password reset link sent",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Password reset link sent to your email")
     *         )
     *     )
     * )
     */
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            $this->passwordResetService->sendResetLink($request->email, 'seller');

            return ResponseHelper::success(
                null,
                'Password reset link sent to your email'
            );
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            Log::error('Seller forgot password failed: ' . $e->getMessage(), [
                'email' => $request->email ?? null,
            ]);
            
            return ResponseHelper::error(
                'Failed to send password reset link. Please try again.',
                null,
                500
            );
        }
    }
}
