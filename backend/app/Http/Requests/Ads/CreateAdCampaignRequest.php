<?php

namespace App\Http\Requests\Ads;

use App\Models\AdCampaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateAdCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', AdCampaign::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'name' => ['required', 'string', 'max:120'],
            'starts_at' => ['required', 'date'], 'ends_at' => ['required', 'date', 'after:starts_at'],
            'budget_type' => ['required', Rule::in(['daily', 'total'])],
            'budget_amount' => ['required', 'numeric', 'min:1', 'max:100000', 'decimal:0,2'],
            'bid_type' => ['required', Rule::in(['cpc'])],
            'bid_amount' => ['required', 'numeric', 'min:0.01', 'lte:budget_amount', 'decimal:0,2'],
            'locations' => ['required', 'array', 'min:1', 'max:100'],
            'locations.*' => ['required', 'string', 'distinct', function ($attribute, $value, $fail) {
                if ($value !== 'global' && ! \App\Models\Country::where('code', $value)->where('is_active', true)->exists()) {
                    $fail('Select a supported country or global targeting.');
                }
            }],
            'placements' => ['required', 'array', 'min:1', 'max:4'],
            'placements.*' => ['required', 'distinct', Rule::in(config('ads.placements'))],
            'idempotency_key' => ['required', 'uuid'],
            'confirm_reservation' => ['required', 'accepted'],
        ];
    }

    public function after(): array
    {
        return [function ($validator) {
            $locations = $this->input('locations', []);
            if (is_array($locations) && in_array('global', $locations) && count($locations) > 1) {
                $validator->errors()->add('locations', 'Choose global OR individual countries.');
            }
        }];
    }
}
