<?php

namespace App\Http\Controllers\Ads;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ads\AdDeliveryRequest;
use App\Http\Requests\Ads\AdEventRequest;
use App\Services\Ads\AdDeliveryService;
use App\Services\Ads\AdTrackingService;

class AdDeliveryController extends Controller
{
    public function index(AdDeliveryRequest $request, AdDeliveryService $delivery)
    {
        return response()->json(['data' => $delivery->deliver($request, $request->validated())])->header('Cache-Control', 'private, no-store');
    }

    public function event(AdEventRequest $request, AdTrackingService $tracking)
    {
        return response()->json(['data' => $tracking->track($request, $request->tracking_token, $request->type,
            $request->has('product_id') ? $request->integer('product_id') : null)])->header('Cache-Control', 'no-store');
    }
}
