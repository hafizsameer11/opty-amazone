<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\StoreUser;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class StoreUserService
{
    /**
     * Get all store users.
     */
    public function getStoreUsers(User $owner, int $storeId): \Illuminate\Database\Eloquent\Collection
    {
        $store = Store::findOrFail($storeId);

        // Verify ownership
        if ($store->user_id !== $owner->id) {
            throw new \Exception('Unauthorized');
        }

        return StoreUser::where('store_id', $storeId)
            ->with('user')
            ->get();
    }

    /**
     * Invite a user to the store.
     */
    public function inviteUser(User $owner, int $storeId, array $data): StoreUser
    {
        try {
            $store = Store::findOrFail($storeId);

            // Verify ownership
            if ($store->user_id !== $owner->id) {
                throw new \Exception('Unauthorized');
            }

            $user = User::where('email', $data['email'])->firstOrFail();

            // Check if user is already associated with store
            $existing = StoreUser::where('store_id', $storeId)
                ->where('user_id', $user->id)
                ->first();

            if ($existing) {
                throw new \Exception('User is already associated with this store');
            }

            return StoreUser::create([
                'store_id' => $storeId,
                'user_id' => $user->id,
                'role' => $data['role'] ?? 'staff',
                'permissions' => $data['permissions'] ?? [],
                'invited_by' => $owner->id,
                'invited_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::error('User invitation failed: ' . $e->getMessage(), [
                'owner_id' => $owner->id,
                'store_id' => $storeId,
            ]);

            throw $e;
        }
    }

    /**
     * Update user role.
     */
    public function updateUserRole(User $owner, int $storeUserId, string $role): StoreUser
    {
        try {
            $storeUser = StoreUser::findOrFail($storeUserId);
            $store = $storeUser->store;

            // Verify ownership
            if ($store->user_id !== $owner->id) {
                throw new \Exception('Unauthorized');
            }

            $storeUser->role = $role;
            $storeUser->save();

            return $storeUser->fresh();
        } catch (\Exception $e) {
            Log::error('User role update failed: ' . $e->getMessage(), [
                'owner_id' => $owner->id,
                'store_user_id' => $storeUserId,
            ]);

            throw $e;
        }
    }

    /**
     * Update user permissions.
     */
    public function updateUserPermissions(User $owner, int $storeUserId, array $permissions): StoreUser
    {
        try {
            $storeUser = StoreUser::findOrFail($storeUserId);
            $store = $storeUser->store;

            // Verify ownership
            if ($store->user_id !== $owner->id) {
                throw new \Exception('Unauthorized');
            }

            $storeUser->permissions = $permissions;
            $storeUser->save();

            return $storeUser->fresh();
        } catch (\Exception $e) {
            Log::error('User permissions update failed: ' . $e->getMessage(), [
                'owner_id' => $owner->id,
                'store_user_id' => $storeUserId,
            ]);

            throw $e;
        }
    }

    /**
     * Remove user from store.
     */
    public function removeUser(User $owner, int $storeUserId): bool
    {
        try {
            $storeUser = StoreUser::findOrFail($storeUserId);
            $store = $storeUser->store;

            // Verify ownership
            if ($store->user_id !== $owner->id) {
                throw new \Exception('Unauthorized');
            }

            return $storeUser->delete();
        } catch (\Exception $e) {
            Log::error('User removal failed: ' . $e->getMessage(), [
                'owner_id' => $owner->id,
                'store_user_id' => $storeUserId,
            ]);

            throw $e;
        }
    }

    /**
     * Accept store invitation.
     */
    public function acceptInvitation(User $user, string $token): StoreUser
    {
        // This would typically involve email verification
        // For now, we'll implement a simple version
        // In production, you'd verify the token from email
        
        throw new \Exception('Invitation acceptance not yet implemented');
    }
}
