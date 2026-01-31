<?php

namespace App\Http\Requests\Seller\Store;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePhoneVisibilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSeller() === true;
    }

    public function rules(): array
    {
        return [
            'phone_visibility' => ['required', 'string', 'in:public,request,hidden'],
        ];
    }
}
