<?php

namespace App\Http\Requests\Campaigns;

use Illuminate\Foundation\Http\FormRequest;

class BannerCampaignRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->role === 'seller' && $this->user()->store !== null; }
    public function rules(): array
    {
        return ['name'=>'required|string|max:255','type'=>'sometimes|in:organic','starts_at'=>'required|date','ends_at'=>'required|date|after:starts_at','schedule_timezone'=>'sometimes|string|max:64|timezone',
            'placement'=>'required|in:homepage_hero,homepage_featured,category_page,store_page,sidebar',
            'targeting'=>'nullable|array:category_id,store_id','targeting.category_id'=>'nullable|integer|exists:categories,id','targeting.store_id'=>'nullable|integer|exists:stores,id',
            'destination_type'=>'required|in:product,category,store,discount_campaign,internal_url,external_url',
            'destination_id'=>'nullable|integer|min:1','destination_url'=>'nullable|string|max:2000',
            'desktop_image'=>[$this->route('campaign') ? 'nullable' : 'required','image','mimes:jpg,jpeg,png,webp','max:5120','dimensions:min_width=100,min_height=50,max_width=8000,max_height=8000'],
            'mobile_image'=>'nullable|image|mimes:jpg,jpeg,png,webp|max:5120|dimensions:min_width=100,min_height=50,max_width=8000,max_height=8000',
            'title'=>'required|string|max:255','description'=>'nullable|string|max:3000','alt_text'=>'required|string|max:255',
            'cta_text'=>'required|string|max:80','sort_order'=>'sometimes|integer|min:0|max:1000','is_active'=>'sometimes|boolean'];
    }
}
