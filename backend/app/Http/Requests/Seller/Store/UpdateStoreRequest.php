<?php

namespace App\Http\Requests\Seller\Store;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSeller() === true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'profile' => ['sometimes', 'array'],
            'profile.tagline' => ['sometimes', 'nullable', 'string', 'max:180'],
            'profile.business_type' => ['sometimes', 'nullable', 'string', 'max:100'],
            'profile.registration_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'profile.tax_id' => ['sometimes', 'nullable', 'string', 'max:64'],
            'profile.address' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'profile.city' => ['sometimes', 'nullable', 'string', 'max:100'],
            'profile.state' => ['sometimes', 'nullable', 'string', 'max:100'],
            'profile.postal_code' => ['sometimes', 'nullable', 'string', 'max:30'],
            'profile.country' => ['sometimes', 'nullable', 'string', 'max:100'],
            'profile.website' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'profile.support_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'profile.shipping_policy' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'profile.return_policy' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ];
    }
}
