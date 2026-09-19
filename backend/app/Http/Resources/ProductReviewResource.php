<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'product_id' => $this->product_id, 'order_item_id' => $this->order_item_id, 'user' => new UserResource($this->whenLoaded('user')), 'rating' => $this->rating, 'comment' => $this->comment, 'is_verified_purchase' => (bool) $this->is_verified_purchase, 'created_at' => $this->created_at?->toISOString(), 'updated_at' => $this->updated_at?->toISOString()];
    }
}
