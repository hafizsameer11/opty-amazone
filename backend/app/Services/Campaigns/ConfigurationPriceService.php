<?php

namespace App\Services\Campaigns;

use App\Models\{Product, ProductVariant, FrameSize, ProductSizeVolume, EyeHygieneVariant, LensThicknessMaterial, LensThicknessOption, LensTreatment, LensType, LensCoating, Category};
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Resolves only database prices; client-supplied prices are never accepted. */
class ConfigurationPriceService
{
    public const VARIANTS = ['variant_id' => ProductVariant::class, 'frame_size_id' => FrameSize::class,
        'product_size_volume_id' => ProductSizeVolume::class, 'eye_hygiene_variant_id' => EyeHygieneVariant::class];

    public function cents(Product $product, array $selection = []): int
    {
        $price = (float) $product->price;
        if (!empty($selection['variant_id'])) {
            $variant = $product->variants()->findOrFail($selection['variant_id']);
            $price = (float) ($variant->price ?? $price);
        }
        if (!empty($selection['contact_lens_pack_quantity'])) {
            $pack = collect($product->contact_lens_unit_config['packs'] ?? [])->firstWhere('quantity', $selection['contact_lens_pack_quantity']);
            if (!$pack) { throw ValidationException::withMessages(['contact_lens_pack_quantity' => 'Invalid pack size.']); }
            $price = (float) ($pack['price'] ?? $product->price);
        }
        foreach (['product_size_volume_id', 'eye_hygiene_variant_id', 'frame_size_id'] as $key) {
            if (empty($selection[$key])) { continue; }
            $variant = self::VARIANTS[$key]::where('product_id', $product->id)->findOrFail($selection[$key]);
            if ($key === 'frame_size_id' && (int) $variant->product_variant_id !== (int) ($selection['variant_id'] ?? 0)) {
                throw ValidationException::withMessages([$key => 'Size must belong to the selected color.']);
            }
            if ($key !== 'frame_size_id' && !$variant->is_active) { throw ValidationException::withMessages([$key => 'Option is inactive.']); }
            $price = (float) ($variant->price ?? $price);
        }
        if (!empty($selection['lens_thickness_material_id'])) {
            $material = LensThicknessMaterial::where('is_active', true)->findOrFail($selection['lens_thickness_material_id']);
            $this->ensureCategoryOption($product, 'store_category_lens_thickness_materials', 'lens_thickness_material_id', $material->id, 'lens_thickness_material_id');
            $price += (float) $material->price;
        }
        if (!empty($selection['lens_thickness_option_id'])) {
            $option = LensThicknessOption::where('is_active', true)->findOrFail($selection['lens_thickness_option_id']);
            // Thickness choices have no independent price in the existing schema, but still
            // need ownership validation before they can become part of an order snapshot.
            $this->ensureCategoryOption($product, 'store_category_lens_thickness_options', 'lens_thickness_option_id', $option->id, 'lens_thickness_option_id');
        }
        foreach (array_unique($selection['treatment_ids'] ?? []) as $id) {
            $treatment = LensTreatment::where('is_active', true)->findOrFail($id);
            $this->ensureCategoryOption($product, 'store_category_lens_treatments', 'lens_treatment_id', $treatment->id, 'treatment_ids');
            $price += (float) $treatment->price;
        }
        // Lens types and coatings use authoritative price adjustments.
        if (!empty($selection['lens_type'])) {
            $type = LensType::where('is_active', true)->where(function ($q) use ($selection) {
                $q->where('slug', $selection['lens_type'])->orWhere('name', $selection['lens_type']);
            })->first();
            if (!$type) { throw ValidationException::withMessages(['lens_type'=>'This lens type is no longer available.']); }
            $this->ensureCategoryOption($product, 'store_category_lens_types', 'lens_type_id', $type->id, 'lens_type');
            $price += (float) $type->price_adjustment;
        }
        if (!empty($selection['lens_coatings'])) {
            $ids = is_array($selection['lens_coatings']) ? $selection['lens_coatings'] : explode(',', $selection['lens_coatings']);
            foreach (array_unique($ids) as $id) {
                $coating = LensCoating::where('is_active', true)->findOrFail($id);
                $this->ensureCategoryOption($product, 'store_category_lens_coatings', 'lens_coating_id', $coating->id, 'lens_coatings');
                $price += (float) $coating->price_adjustment;
            }
        }
        if (!empty($selection['progressive_variant_id'])) {
            // This checkout references a progressive endpoint/table absent from this project.
            // Never accept a purchasable option whose authoritative price cannot be resolved.
            throw ValidationException::withMessages(['progressive_variant_id'=>'This progressive option is unavailable. Select an available lens configuration.']);
        }
        return max(0, (int) round($price * 100));
    }

    /**
     * Match the product endpoint's category fallback exactly: if the store configured
     * any lens types on the nearest category, all lens choices must come from that
     * category. If no category configuration exists, the global active catalog applies.
     */
    private function ensureCategoryOption(Product $product, string $table, string $column, int $id, string $field): void
    {
        $categoryId = $this->configuredCategoryId($product);
        if (!$categoryId) {
            return;
        }

        $allowed = DB::table($table)
            ->where('store_id', $product->store_id)
            ->where('category_id', $categoryId)
            ->where($column, $id)
            ->exists();

        if (!$allowed) {
            throw ValidationException::withMessages([$field => 'This option is not available for the selected product.']);
        }
    }

    private function configuredCategoryId(Product $product): ?int
    {
        if (!$product->category_id || !$product->store_id) {
            return null;
        }

        $categoryId = (int) $product->category_id;
        $visited = [];
        while ($categoryId && !isset($visited[$categoryId])) {
            $visited[$categoryId] = true;
            if (DB::table('store_category_lens_types')
                ->where('store_id', $product->store_id)
                ->where('category_id', $categoryId)
                ->exists()) {
                return $categoryId;
            }
            $categoryId = (int) (Category::find($categoryId)?->parent_id ?? 0);
        }

        return null;
    }
}
