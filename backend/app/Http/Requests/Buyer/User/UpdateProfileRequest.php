<?php

namespace App\Http\Requests\Buyer\User;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isBuyer() === true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            // Buyer email is the account identifier and cannot be changed from
            // the profile screen.
            'email' => ['prohibited'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', 'unique:users,phone,' . $this->user()?->id],
        ];
    }
}
