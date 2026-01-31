<?php

namespace App\Http\Requests\Seller\Store;

use Illuminate\Foundation\Http\FormRequest;

class InviteUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSeller() === true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'exists:users,email'],
            'role' => ['sometimes', 'string', 'in:owner,manager,staff'],
            'permissions' => ['sometimes', 'array'],
        ];
    }
}
