<?php

namespace App\Http\Requests\Seller\Store;

use Illuminate\Foundation\Http\FormRequest;

class StoreSocialLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSeller() === true;
    }

    public function rules(): array
    {
        return [
            'platform' => ['required', 'string', 'in:facebook,instagram,twitter,linkedin,youtube,website,other'],
            'url' => ['required', 'url', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
