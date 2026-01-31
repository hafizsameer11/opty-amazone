<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreStatisticResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'store_id' => $this->store_id,
            'total_views' => $this->total_views,
            'total_clicks' => $this->total_clicks,
            'total_orders' => $this->total_orders,
            'total_revenue' => (float) $this->total_revenue,
            'total_products' => $this->total_products,
            'total_followers' => $this->total_followers,
            'total_reviews' => $this->total_reviews,
            'average_rating' => (float) $this->average_rating,
            'last_calculated_at' => $this->last_calculated_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
