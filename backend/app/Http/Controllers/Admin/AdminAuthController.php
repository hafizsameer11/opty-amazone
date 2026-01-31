<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Tag(
 *     name="Admin Auth",
 *     description="Admin authentication endpoints"
 * )
 */
class AdminAuthController extends Controller
{
    public function __construct(
        private AuthService $authService
    ) {}

    /**
     * @OA\Post(
     *     path="/api/admin/auth/login",
     *     summary="Login admin",
     *     tags={"Admin Auth"},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"email", "password"},
     *             @OA\Property(property="email", type="string", format="email", example="admin@example.com"),
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
                'admin'
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
            Log::error('Admin login failed: ' . $e->getMessage(), [
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
     *     path="/api/admin/auth/logout",
     *     summary="Logout admin",
     *     tags={"Admin Auth"},
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
            Log::error('Admin logout failed: ' . $e->getMessage(), [
                'user_id' => $request->user()->id ?? null,
            ]);
            
            return ResponseHelper::error(
                'Logout failed. Please try again.',
                null,
                500
            );
        }
    }
}
