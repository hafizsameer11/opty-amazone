<?php

namespace App\Http\Controllers\Seller\Store;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\Store\InviteUserRequest;
use App\Http\Requests\Seller\Store\UpdateStoreUserRequest;
use App\Http\Resources\StoreUserResource;
use App\Services\Store\StoreUserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerStoreUsersController extends Controller
{
    public function __construct(
        private StoreUserService $storeUserService
    ) {}

    /**
     * Get all store users.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $store = $request->user()->store;

            if (!$store) {
                return ResponseHelper::notFound('Store not found');
            }

            $users = $this->storeUserService->getStoreUsers($request->user(), $store->id);

            return ResponseHelper::success([
                'users' => StoreUserResource::collection($users),
            ]);
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve store users');
        }
    }

    /**
     * Invite a user to the store.
     */
    public function store(InviteUserRequest $request): JsonResponse
    {
        try {
            $store = $request->user()->store;

            if (!$store) {
                return ResponseHelper::notFound('Store not found');
            }

            $storeUser = $this->storeUserService->inviteUser($request->user(), $store->id, $request->validated());

            return ResponseHelper::success([
                'user' => new StoreUserResource($storeUser->load('user')),
            ], 'User invited successfully', 201);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Update store user role/permissions.
     */
    public function update(int $id, UpdateStoreUserRequest $request): JsonResponse
    {
        try {
            if ($request->has('role')) {
                $storeUser = $this->storeUserService->updateUserRole(
                    $request->user(),
                    $id,
                    $request->input('role')
                );
            } elseif ($request->has('permissions')) {
                $storeUser = $this->storeUserService->updateUserPermissions(
                    $request->user(),
                    $id,
                    $request->input('permissions')
                );
            } else {
                return ResponseHelper::error('No valid fields to update');
            }

            return ResponseHelper::success([
                'user' => new StoreUserResource($storeUser->load('user')),
            ], 'User updated successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update user');
        }
    }

    /**
     * Remove user from store.
     */
    public function destroy(int $id, Request $request): JsonResponse
    {
        try {
            $this->storeUserService->removeUser($request->user(), $id);

            return ResponseHelper::success(null, 'User removed successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to remove user');
        }
    }
}
