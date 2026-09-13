<?php

namespace App\Http\Requests\Ads;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::in(['pay', 'pause', 'resume', 'cancel', 'approve', 'reject', 'terminate', 'refund'])],
            'reason' => [Rule::requiredIf(fn () => $this->user()->isAdmin()), 'nullable', 'string', 'min:3', 'max:2000'],
        ];
    }
}
