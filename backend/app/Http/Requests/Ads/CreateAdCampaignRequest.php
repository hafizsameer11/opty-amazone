<?php

namespace App\Http\Requests\Ads;

use App\Models\AdCampaign;
use Carbon\CarbonImmutable;
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
            // The browser sends an IANA zone alongside its local date-time. The server
            // stores the resulting instant in UTC so a scheduler never depends on the
            // PHP/server timezone.
            'schedule_timezone' => ['required', 'string', 'max:64', 'timezone'],
            'launch_mode' => ['required', Rule::in(['run_now', 'schedule'])],
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

            // A run-now campaign is activated from the server clock, but the submitted
            // timestamp still protects us from replaying stale client requests. Keep a
            // small transport tolerance so a request sent with the current device time
            // remains valid after it reaches the API.
            if ($this->input('launch_mode') === 'run_now' && $this->filled('starts_at')) {
                try {
                    if (CarbonImmutable::parse($this->input('starts_at'))->lt(now('UTC')->subMinutes(5))) {
                        $validator->errors()->add('starts_at', 'A run-now campaign request cannot use a stale start time.');
                    }
                } catch (\Throwable) {
                    // The normal date rule above reports malformed values.
                }
            }
        }];
    }
}
