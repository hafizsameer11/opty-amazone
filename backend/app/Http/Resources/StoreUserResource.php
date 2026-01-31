<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreUserResource extends JsonResource
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
            'user' => new UserResource($this->whenLoaded('user')),
            'role' => $this->role,
            'permissions' => $this->permissions,
            'is_active' => $this->is_active,
            'invited_by' => $this->invited_by,
            'invited_at' => $this->invited_at?->toISOString(),
            'joined_at' => $this->joined_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}
