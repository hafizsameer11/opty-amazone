<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\Admin\AdminActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminSettingsController extends Controller
{
    private const DEFAULTS = [
        'platform_name' => 'VistaExpress Marketplace',
        'platform_email' => 'admin@optyamazone.com',
        'currency' => 'EUR',
        'points_enabled' => true,
        'points_per_euro' => 1,
        'points_redemption_rate' => 100,
    ];

    public function index(): JsonResponse
    {
        $stored = PlatformSetting::allCached();
        $settings = array_merge(self::DEFAULTS, $stored);

        // Prefer env name if never customized
        if (!array_key_exists('platform_name', $stored)) {
            $settings['platform_name'] = env('APP_NAME', self::DEFAULTS['platform_name']);
        }
        if (!array_key_exists('platform_email', $stored)) {
            $settings['platform_email'] = env('MAIL_FROM_ADDRESS', self::DEFAULTS['platform_email']);
        }

        return ResponseHelper::success($settings, 'Settings retrieved successfully');
    }

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

        $payload = $validator->validated();
        PlatformSetting::setMany($payload);

        AdminActivityLogger::log(
            $request->user(),
            'settings.update',
            'platform_settings',
            null,
            true,
            $payload,
            $request
        );

        $settings = array_merge(self::DEFAULTS, PlatformSetting::allCached());

        return ResponseHelper::success($settings, 'Settings updated successfully');
    }
}
