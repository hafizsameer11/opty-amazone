<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdDeliveryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['placement' => ['required', Rule::in(config('ads.placements'))],
            'category_id' => ['required_if:placement,categories,recommendations', 'nullable', 'integer', 'exists:categories,id'],
            'exclude_product_id' => ['required_if:placement,recommendations', 'nullable', 'integer', 'exists:products,id'],
            'query' => ['required_if:placement,search', 'nullable', 'string', 'min:2', 'max:120']];
    }
}
