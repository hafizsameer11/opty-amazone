<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminSettingsController extends Controller
{
    /**
     * Get platform settings.
     */
    public function index(): JsonResponse
    {
        // In a real app, this would come from a settings table
        $settings = [
            'platform_name' => env('APP_NAME', 'Optical Marketplace'),
            'platform_email' => env('MAIL_FROM_ADDRESS', 'admin@example.com'),
            'currency' => 'EUR',
            'points_enabled' => true,
            'points_per_euro' => 1,
            'points_redemption_rate' => 100,
        ];

        return ResponseHelper::success($settings, 'Settings retrieved successfully');
    }

    /**
     * Update platform settings.
     */
    public function update(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'platform_name' => 'sometimes|string|max:255',
            'platform_email' => 'sometimes|email',
            'currency' => 'sometimes|string|max:3',
            'points_enabled' => 'sometimes|boolean',
            'points_per_euro' => 'sometimes|numeric|min:0',
            'points_redemption_rate' => 'sometimes|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return ResponseHelper::validationError($validator->errors());
        }

        // In a real app, this would save to a settings table
        // For now, just return success
        return ResponseHelper::success($request->all(), 'Settings updated successfully');
    }
}
