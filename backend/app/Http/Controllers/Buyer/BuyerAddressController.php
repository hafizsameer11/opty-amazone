<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Buyer\Address\StoreAddressRequest;
use App\Http\Requests\Buyer\Address\UpdateAddressRequest;
use App\Http\Resources\UserAddressResource;
use App\Services\User\AddressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * @OA\Tag(
 *     name="Buyer Addresses",
 *     description="Buyer address management"
 * )
 */
class BuyerAddressController extends Controller
{
    public function __construct(
        private AddressService $addressService,
    ) {
    }

    /**
     * List all addresses for the authenticated buyer.
     */
    public function index(Request $request): JsonResponse
    {
        $addresses = $this->addressService->getAddresses($request->user());

        return ResponseHelper::success(
            UserAddressResource::collection($addresses)
        );
    }

    /**
     * Show a single address for the authenticated buyer.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $address = $this->addressService->getAddress($request->user(), $id);

            return ResponseHelper::success(
                new UserAddressResource($address)
            );
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        }
    }

    /**
     * Store a new address for the authenticated buyer.
     */
    public function store(StoreAddressRequest $request): JsonResponse
    {
        try {
            $address = $this->addressService->createAddress(
                $request->user(),
                $request->validated()
            );

            return ResponseHelper::success(
                new UserAddressResource($address),
                'Address created successfully',
                201
            );
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to create address');
        }
    }

    /**
     * Update an address for the authenticated buyer.
     */
    public function update(UpdateAddressRequest $request, int $id): JsonResponse
    {
        try {
            $address = $this->addressService->updateAddress(
                $request->user(),
                $id,
                $request->validated()
            );

            return ResponseHelper::success(
                new UserAddressResource($address),
                'Address updated successfully'
            );
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to update address');
        }
    }

    /**
     * Delete an address for the authenticated buyer.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $this->addressService->deleteAddress($request->user(), $id);

            return ResponseHelper::success(null, 'Address deleted successfully');
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to delete address');
        }
    }

    /**
     * Set an address as default for the authenticated buyer.
     */
    public function setDefault(Request $request, int $id): JsonResponse
    {
        try {
            $address = $this->addressService->setDefaultAddress($request->user(), $id);

            return ResponseHelper::success(
                new UserAddressResource($address),
                'Default address updated successfully'
            );
        } catch (ValidationException $e) {
            return ResponseHelper::validationError($e->errors());
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to set default address');
        }
    }
}

