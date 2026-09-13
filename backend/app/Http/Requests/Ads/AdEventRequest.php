<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['tracking_token' => 'required|string|max:4096',
            'type' => ['required', Rule::in(['impression', 'click', 'product_view'])],
            'product_id' => 'required_if:type,product_view|integer|min:1'];
    }
}
