<?php

namespace App\Services\Optical;

use App\Models\Category;
use App\Models\StoreCategoryFieldConfig;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/** The Optical publication form contract mirrors the five Seller Panel create forms. */
class ProductForm
{
    public static function type(string $slug): ?string
    {
        return ['eye-glasses' => 'frame', 'sun-glasses' => 'sunglasses', 'contact-lenses' => 'contact_lens', 'eye-hygiene' => 'eye_hygiene', 'accessori' => 'accessory', 'opty-kids' => 'frame'][$slug] ?? null;
    }

    private static function field(string $key, string $label, string $type = 'text', array $extra = []): array
    {
        return ['key' => $key, 'label' => $label, 'type' => $type, ...$extra];
    }

    public static function common(): array
    {
        $f = self::field(...);

        return [$f('name', 'Vista product name', 'text', ['required' => true, 'maxLength' => 255]), $f('sku', 'Vista SKU', 'text', ['maxLength' => 255]), $f('description', 'Description', 'textarea'), $f('short_description', 'Short description', 'textarea', ['maxLength' => 500]), $f('price', 'Price (EUR)', 'number', ['required' => true, 'min' => 0, 'step' => '0.01']), $f('compare_at_price', 'Compare-at price (EUR)', 'number', ['min' => 0, 'step' => '0.01']), $f('cost_price', 'Cost price (EUR)', 'number', ['min' => 0, 'step' => '0.01']), $f('is_active', 'Active listing', 'boolean'), $f('is_featured', 'Featured listing', 'boolean')];
    }

    public static function fields(string $type, array $enabled = []): array
    {
        $f = self::field(...);
        $gender = $f('gender', 'Gender', 'select', ['options' => ['unisex', 'men', 'women', 'kids']]);
        $stock = $f('stock_quantity', 'Quantity to allocate to this option', 'number', ['required' => true, 'min' => 0, 'step' => '1']);
        $price = $f('price', 'Price (EUR)', 'number', ['min' => 0, 'step' => '0.01']);
        $photo = $f('image_index', 'Product photo number', 'number', ['min' => 1, 'max' => 10, 'step' => '1']);
        $sizes = $f('sizes', 'Sizes', 'rows', ['fields' => [$f('size_label', 'Size (e.g. Medium or 52-18-140)', 'text', ['required' => true, 'maxLength' => 100]), $f('lens_width', 'Lens width (mm)', 'number', ['min' => 0]), $f('bridge_width', 'Bridge width (mm)', 'number', ['min' => 0]), $f('temple_length', 'Temple length (mm)', 'number', ['min' => 0]), $stock]]);
        $fields = match ($type) {
            'frame','sunglasses' => [$f('frame_shape', 'Frame shape', 'text', ['maxLength' => 255]), $f('frame_material', 'Frame material', 'text', ['maxLength' => 255]), $f('frame_color', 'Default frame color', 'text', ['maxLength' => 255]), $gender, $f('lens_type', 'Lens type / note', 'textarea'), $f('lens_index_options', 'Lens index / thickness', 'multiselect', ['options' => ['1.5', '1.56', '1.6', '1.67', '1.74']]), $f('treatment_options', 'Lens treatments', 'multiselect', ['options' => ['anti_reflective', 'blue_light', 'uv_protection', 'photochromic', 'polarized', 'scratch_resistant', 'hydrophobic']]), $f('lens_colors', 'Lens colors', 'rows', ['fields' => [$f('name', 'Color name', 'text', ['required' => true, 'maxLength' => 100]), $f('color_code', 'Color code', 'text', ['maxLength' => 20]), $f('description', 'Color description', 'text', ['maxLength' => 255])]]), $f('variants', 'Color variations', 'rows', ['fields' => [$f('color_name', 'Color name', 'text', ['required' => true, 'maxLength' => 255]), $f('color_code', 'Hex color (#RRGGBB)', 'text', ['pattern' => '#[0-9A-Fa-f]{6}', 'maxLength' => 7]), $price, $stock, $f('image_indices', 'Product photo numbers', 'multiselect', ['options' => array_map('strval', range(1, 10))]), $f('is_default', 'Default color', 'boolean'), $sizes]])],
            'contact_lens' => [$f('contact_lens_brand', 'Contact lens brand', 'text', ['maxLength' => 100]), $f('contact_lens_type', 'Contact lens type', 'text', ['maxLength' => 50]), $f('contact_lens_color', 'Contact lens color', 'text', ['maxLength' => 100]), $f('contact_lens_material', 'Contact lens material', 'text', ['maxLength' => 100]), $f('replacement_frequency', 'Replacement frequency', 'select', ['options' => ['daily', 'weekly', 'monthly', 'yearly']]), $f('water_content', 'Water content', 'text', ['maxLength' => 50]), $f('base_curve_options', 'Base curves (comma separated)', 'list'), $f('diameter_options', 'Diameters (comma separated)', 'list'), $f('powers_range', 'Powers range', 'text'), $f('has_uv_filter', 'UV filter', 'boolean'), $f('can_sleep_with', 'Extended wear / sleep with lenses', 'boolean'), $f('is_medical_device', 'Medical device / prescription', 'boolean')],
            'eye_hygiene' => [$f('size_volume', 'Listing size / volume', 'text', ['maxLength' => 50]), $f('pack_type', 'Listing pack type', 'text', ['maxLength' => 50]), $f('expiry_date', 'Expiry date', 'date'), $f('size_volume_variants', 'Size / volume options', 'rows', ['fields' => [$f('size_volume', 'Size / volume', 'text', ['required' => true, 'maxLength' => 50]), $f('pack_type', 'Pack type', 'text', ['maxLength' => 50]), $price, $f('compare_at_price', 'Compare-at price', 'number', ['min' => 0, 'step' => '0.01']), $f('cost_price', 'Cost price', 'number', ['min' => 0, 'step' => '0.01']), $stock, $f('sku', 'Option SKU', 'text', ['maxLength' => 255]), $f('expiry_date', 'Expiry date', 'date'), $photo, $f('is_active', 'Active option', 'boolean')]]), $f('eye_hygiene_variants', 'Product variants / uses', 'rows', ['fields' => [$f('name', 'Variant name', 'text', ['required' => true, 'maxLength' => 255]), $f('description', 'Description', 'textarea'), $price, $photo, $f('is_active', 'Active variant', 'boolean')]])],
            'accessory' => [$gender],default => []
        };

        // Explicit store configuration wins. Structured editors are not category toggles.
        return array_values(array_filter($fields, fn ($field) => $field['type'] === 'rows' || ! array_key_exists($field['key'], $enabled) || $enabled[$field['key']]));
    }

    public static function schema(Category $category, int $store): array
    {
        $type = self::type($category->slug);
        $config = StoreCategoryFieldConfig::where('store_id', $store)->where('category_id', $category->id)->value('field_config') ?? [];

        return ['product_type' => $type, 'fields' => self::fields($type ?? '', $config)];
    }

    public static function validate(array $data, int $store): array
    {
        $category = Category::where('is_active', true)->whereNull('parent_id')->find($data['category_id'] ?? null);
        if (! $category || ! self::type($category->slug) || ($data['product_type'] ?? null) !== self::type($category->slug)) {
            throw ValidationException::withMessages(['product.category_id' => 'Select a compatible active Vista category.']);
        }
        $schema = self::schema($category, $store);
        $rules = ['category_id' => 'required|integer', 'product_type' => 'required|string', 'sub_category_id' => 'nullable|integer'];
        self::rules([...self::common(), ...$schema['fields']], $rules);
        $unknown = array_diff(array_keys($data), array_keys($rules));
        if ($unknown) {
            throw ValidationException::withMessages(['product.'.reset($unknown) => 'This field is unavailable for the selected seller category.']);
        }
        $valid = Validator::make($data, $rules)->validate();
        if (! empty($valid['sub_category_id'])) {
            $leaf = Category::where('is_active', true)->find($valid['sub_category_id']);
            $seen = [];
            while ($leaf && $leaf->parent_id && ! in_array($leaf->id, $seen)) {
                $seen[] = $leaf->id;
                if ($leaf->parent_id === $category->id) {
                    break;
                } $leaf = Category::where('is_active', true)->find($leaf->parent_id);
            }
            if (! $leaf || $leaf->parent_id !== $category->id) {
                throw ValidationException::withMessages(['product.sub_category_id' => 'Choose a subcategory within the selected category.']);
            }
        }

        return $valid;
    }

    private static function rules(array $fields, array &$rules, string $prefix = ''): void
    {
        foreach ($fields as $f) {
            $key = $prefix.$f['key'];
            $rule = ($f['required'] ?? false) ? 'required' : 'nullable';
            $rule .= '|'.match ($f['type']) {
                'rows','list','multiselect' => 'array','boolean' => 'boolean','number' => ($f['step'] ?? '') === '1' ? 'integer' : 'numeric','date' => 'date_format:Y-m-d',default => 'string'
            };
            if (isset($f['maxLength'])) {
                $rule .= '|max:'.$f['maxLength'];
            }
            if (isset($f['min'])) {
                $rule .= '|min:'.$f['min'];
            }
            if (isset($f['max'])) {
                $rule .= '|max:'.$f['max'];
            }
            if ($f['type'] === 'select') {
                $rule .= '|in:'.implode(',', $f['options']);
            }
            if (isset($f['pattern'])) {
                $rule .= '|regex:/^'.$f['pattern'].'$/D';
            }
            if ($f['type'] === 'rows') {
                $keys = array_column($f['fields'], 'key');
                $rule .= '|max:50';
                $rules[$key.'.*'] = 'array:'.implode(',', [...$keys, 'option_key']);
                $rules[$key.'.*.option_key'] = 'required|uuid|distinct';
                self::rules($f['fields'], $rules, $key.'.*.');
            }
            if (in_array($f['type'], ['list', 'multiselect'])) {
                $rules[$key.'.*'] = 'string|max:100'.($f['type'] === 'multiselect' ? '|in:'.implode(',', $f['options']) : '');
            }
            $rules[$key] = $rule;
        }
    }
}
