<?php

namespace App\Http\Requests\Seller\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\ValidationException;

class ChangeEmailRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isSeller() === true;
    }

    public function rules(): array
    {
        return [
            // The address is the login identifier, so it must stay unique.
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email,' . $this->user()?->id,
            ],
        ];
    }

    /**
     * Changing the login identifier is only allowed before it has been proven.
     * Once the seller has verified the address, the account must keep it.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if ($this->user()?->hasVerifiedEmail()) {
                throw ValidationException::withMessages([
                    'email' => ['This email address is already verified and cannot be changed. Contact support if you need to update it.'],
                ]);
            }
        });
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An account already uses this email address.',
        ];
    }
}