<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Country;
use App\Models\State;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @OA\Tag(
 *     name="Geographic",
 *     description="Geographic data endpoints (Countries, States, Cities)"
 * )
 */
class GeographicController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/geographic/countries",
     *     summary="Get all countries",
     *     tags={"Geographic"},
     *     @OA\Parameter(
     *         name="active_only",
     *         in="query",
     *         description="Return only active countries",
     *         required=false,
     *         @OA\Schema(type="boolean", default=true)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of countries",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Countries retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="United States"),
     *                     @OA\Property(property="code", type="string", example="USA"),
     *                     @OA\Property(property="phone_code", type="string", example="+1"),
     *                     @OA\Property(property="currency_code", type="string", example="USD"),
     *                     @OA\Property(property="is_active", type="boolean", example=true)
     *                 )
     *             )
     *         )
     *     )
     * )
     */
    public function getCountries(Request $request): JsonResponse
    {
        try {
            $activeOnly = $request->boolean('active_only', true);
            
            $query = Country::query();
            
            if ($activeOnly) {
                $query->where('is_active', true);
            }
            
            $countries = $query->orderBy('name')->get();
            
            return ResponseHelper::success($countries, 'Countries retrieved successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve countries: ' . $e->getMessage());
        }
    }

    /**
     * @OA\Get(
     *     path="/api/geographic/countries/{countryId}/states",
     *     summary="Get states by country",
     *     tags={"Geographic"},
     *     @OA\Parameter(
     *         name="countryId",
     *         in="path",
     *         description="Country ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="active_only",
     *         in="query",
     *         description="Return only active states",
     *         required=false,
     *         @OA\Schema(type="boolean", default=true)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of states",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="States retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="country_id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="California"),
     *                     @OA\Property(property="code", type="string", example="CA"),
     *                     @OA\Property(property="is_active", type="boolean", example=true)
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Country not found"
     *     )
     *     )
     */
    public function getStatesByCountry(Request $request, int $countryId): JsonResponse
    {
        try {
            $country = Country::find($countryId);
            
            if (!$country) {
                return ResponseHelper::notFound('Country not found');
            }
            
            $activeOnly = $request->boolean('active_only', true);
            
            $query = State::where('country_id', $countryId);
            
            if ($activeOnly) {
                $query->where('is_active', true);
            }
            
            $states = $query->orderBy('name')->get();
            
            return ResponseHelper::success($states, 'States retrieved successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve states: ' . $e->getMessage());
        }
    }

    /**
     * @OA\Get(
     *     path="/api/geographic/states/{stateId}/cities",
     *     summary="Get cities by state",
     *     tags={"Geographic"},
     *     @OA\Parameter(
     *         name="stateId",
     *         in="path",
     *         description="State ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="active_only",
     *         in="query",
     *         description="Return only active cities",
     *         required=false,
     *         @OA\Schema(type="boolean", default=true)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of cities",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Cities retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="state_id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="Los Angeles"),
     *                     @OA\Property(property="is_active", type="boolean", example=true)
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="State not found"
     *     )
     *     )
     */
    public function getCitiesByState(Request $request, int $stateId): JsonResponse
    {
        try {
            $state = State::find($stateId);
            
            if (!$state) {
                return ResponseHelper::notFound('State not found');
            }
            
            $activeOnly = $request->boolean('active_only', true);
            
            $query = City::where('state_id', $stateId);
            
            if ($activeOnly) {
                $query->where('is_active', true);
            }
            
            $cities = $query->orderBy('name')->get();
            
            return ResponseHelper::success($cities, 'Cities retrieved successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve cities: ' . $e->getMessage());
        }
    }

    /**
     * @OA\Get(
     *     path="/api/geographic/countries/{countryId}/states/{stateId}/cities",
     *     summary="Get cities by country and state",
     *     tags={"Geographic"},
     *     @OA\Parameter(
     *         name="countryId",
     *         in="path",
     *         description="Country ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="stateId",
     *         in="path",
     *         description="State ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="active_only",
     *         in="query",
     *         description="Return only active cities",
     *         required=false,
     *         @OA\Schema(type="boolean", default=true)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of cities",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Cities retrieved successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(
     *                     @OA\Property(property="id", type="integer", example=1),
     *                     @OA\Property(property="state_id", type="integer", example=1),
     *                     @OA\Property(property="name", type="string", example="Los Angeles"),
     *                     @OA\Property(property="is_active", type="boolean", example=true)
     *                 )
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Country or State not found"
     *     )
     */
    public function getCitiesByCountryAndState(Request $request, int $countryId, int $stateId): JsonResponse
    {
        try {
            $country = Country::find($countryId);
            $state = State::find($stateId);
            
            if (!$country) {
                return ResponseHelper::notFound('Country not found');
            }
            
            if (!$state) {
                return ResponseHelper::notFound('State not found');
            }
            
            if ($state->country_id !== $countryId) {
                return ResponseHelper::error('State does not belong to the specified country', null, 400);
            }
            
            $activeOnly = $request->boolean('active_only', true);
            
            $query = City::where('state_id', $stateId);
            
            if ($activeOnly) {
                $query->where('is_active', true);
            }
            
            $cities = $query->orderBy('name')->get();
            
            return ResponseHelper::success($cities, 'Cities retrieved successfully');
        } catch (\Exception $e) {
            return ResponseHelper::serverError('Failed to retrieve cities: ' . $e->getMessage());
        }
    }
}
