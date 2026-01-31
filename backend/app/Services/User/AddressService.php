<?php

namespace App\Services\User;

use App\Models\User;
use App\Models\UserAddress;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AddressService
{
    /**
     * Get all addresses for the authenticated user.
     *
     * @return \Illuminate\Database\Eloquent\Collection<int, UserAddress>
     */
    public function getAddresses(User $user)
    {
        return $user->addresses()->orderByDesc('is_default')->latest()->get();
    }

    /**
     * Get a single address for the authenticated user.
     */
    public function getAddress(User $user, int $addressId): UserAddress
    {
        $address = $user->addresses()->whereKey($addressId)->first();

        if (!$address) {
            throw ValidationException::withMessages([
                'address' => ['The requested address was not found.'],
            ]);
        }

        return $address;
    }

    /**
     * Create a new address for the authenticated user.
     */
    public function createAddress(User $user, array $data): UserAddress
    {
        try {
            $address = $user->addresses()->create($data);

            // If this is the user's first address, mark as default
            if ($user->addresses()->count() === 1) {
                $this->setDefaultAddress($user, $address->id);
                $address->refresh();
            }

            return $address;
        } catch (\Exception $e) {
            Log::error('Address creation failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Update an existing address for the authenticated user.
     */
    public function updateAddress(User $user, int $addressId, array $data): UserAddress
    {
        try {
            $address = $this->getAddress($user, $addressId);
            $address->fill($data);
            $address->save();

            return $address->fresh();
        } catch (\Exception $e) {
            Log::error('Address update failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'address_id' => $addressId,
            ]);

            throw $e;
        }
    }

    /**
     * Delete an address for the authenticated user.
     */
    public function deleteAddress(User $user, int $addressId): void
    {
        try {
            $address = $this->getAddress($user, $addressId);

            $wasDefault = $address->is_default;
            $address->delete();

            // If deleted address was default, try to make another address default
            if ($wasDefault) {
                $next = $user->addresses()->where('id', '!=', $addressId)->first();
                if ($next) {
                    $this->setDefaultAddress($user, $next->id);
                }
            }
        } catch (\Exception $e) {
            Log::error('Address delete failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'address_id' => $addressId,
            ]);

            throw $e;
        }
    }

    /**
     * Set an address as default for the authenticated user.
     */
    public function setDefaultAddress(User $user, int $addressId): UserAddress
    {
        $address = $this->getAddress($user, $addressId);

        $user->addresses()->where('id', '!=', $addressId)->update([
            'is_default' => false,
        ]);

        $address->is_default = true;
        $address->save();

        return $address->fresh();
    }
}

