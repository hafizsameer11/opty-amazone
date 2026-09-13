<?php

namespace App\Http\Requests\Ads;

use App\Models\AdCampaign;
use Illuminate\Foundation\Http\FormRequest;

class AdListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', AdCampaign::class) ?? false;
    }

    public function rules(): array
    {
        return ['status' => 'sometimes|string|max:32', 'payment_status' => 'sometimes|string|max:32',
            'seller_id' => 'sometimes|integer|min:1', 'product_id' => 'sometimes|integer|min:1',
            'from' => 'sometimes|date', 'to' => 'sometimes|date|after_or_equal:from',
            'page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100'];
    }
}
