<?php

namespace App\Http\Requests\Campaigns;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DiscountCampaignRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->role === 'seller' && $this->user()->store !== null; }
    public function rules(): array
    {
        return [
            'name'=>'required|string|max:255', 'description'=>'nullable|string|max:5000',
            'scope'=>'required|in:products,variants,categories,store', 'discount_type'=>'required|in:percentage,fixed',
            'discount_value'=>['required','numeric','min:0.01', $this->input('discount_type') === 'percentage' ? 'max:100' : 'max:1000000'],
            'starts_at'=>'required|date', 'ends_at'=>'required|date|after:starts_at', 'schedule_timezone'=>'sometimes|string|max:64|timezone', 'status'=>'sometimes|in:draft,scheduled',
            'minimum_order_amount'=>'sometimes|numeric|min:0|max:10000000', 'minimum_quantity'=>'sometimes|integer|min:1|max:1000000',
            'maximum_discount'=>'nullable|numeric|min:0.01|max:1000000', 'usage_limit'=>'nullable|integer|min:1|max:100000000',
            'per_buyer_limit'=>'nullable|integer|min:1|max:100000000', 'priority'=>'sometimes|integer|min:0|max:1000', 'stacking'=>'sometimes|boolean',
            'product_ids'=>'required_if:scope,products|array|max:1000', 'product_ids.*'=>['integer', Rule::exists('products','id')->where('store_id', $this->user()->store->id)->whereNull('deleted_at')],
            'category_ids'=>'required_if:scope,categories|array|max:1000', 'category_ids.*'=>'integer|exists:categories,id',
            'variants'=>'required_if:scope,variants|array|max:1000', 'variants.*.variant_type'=>'required|in:variant_id,frame_size_id,product_size_volume_id,eye_hygiene_variant_id',
            'variants.*.variant_id'=>'required|integer|min:1',
        ];
    }
}
