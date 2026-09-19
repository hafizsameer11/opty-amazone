<?php

namespace App\Http\Requests\Buyer\Store;

use Illuminate\Foundation\Http\FormRequest;

class CreateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isBuyer() === true;
    }

    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'order_item_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'store_order_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
