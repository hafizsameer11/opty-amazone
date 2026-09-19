<?php

namespace App\Http\Requests\Buyer\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'phone' => [
                'required',
                'string',
                'max:20',
                'unique:users,phone',
            ],
            // Kept in the request contract so the frontend can collect a
            // verification code. Code delivery/verification is handled by a
            // separate verification provider and is intentionally not stored
            // as part of the user record.
            'verification_code' => ['nullable', 'string', 'max:12'],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
            // A token comes from a referral-link visit; a code is optional manual
            // entry. They are validated by ReferralService inside registration's DB
            // transaction so an invalid referral never leaves a partial account.
            'referral_attribution_token' => ['nullable', 'string', 'max:64'],
            'referral_code' => ['nullable', 'string', 'max:48'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Name is required',
            'email.required' => 'Email is required',
            'email.email' => 'Email must be a valid email address',
            'email.unique' => 'Email already exists',
            'phone.unique' => 'Phone number already exists',
            'phone.required' => 'Phone number is required',
            'password.required' => 'Password is required',
            'password.min' => 'Password must be at least 8 characters',
            'password.confirmed' => 'Password confirmation does not match',
        ];
    }
}
