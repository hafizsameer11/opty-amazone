<?php

namespace App\Services\Optical;

use App\Support\FrameOptionCatalog;

/** Specialized controls and structures used by the current seller create/edit pages. */
final class SellerFormSchema
{
    public static function field(string $key, string $label, string $type = 'text', array $extra = []): array
    {
        return compact('key', 'label', 'type') + $extra;
    }

    public static function stockStatus(): array
    {
        return self::field('stock_status', 'Stock status', 'select', ['options' => ['in_stock', 'out_of_stock', 'backorder']]);
    }

    public static function extend(array $fields, string $type): array
    {
        $f = self::field(...);
        foreach ($fields as &$field) {
            if ($field['key'] === 'frame_shape') {
                $field = $f('frame_shape', 'Frame shape', 'select', ['options' => FrameOptionCatalog::SHAPES, 'allowLegacy' => true]);
            } elseif ($field['key'] === 'frame_material') {
                $field = $f('frame_material', 'Frame material', 'select', ['options' => FrameOptionCatalog::MATERIALS, 'allowLegacy' => true]);
            } elseif ($field['key'] === 'frame_color') {
                $field = $f('frame_color', 'Default frame color', 'palette', ['options' => array_keys(FrameOptionCatalog::COLORS), 'swatches' => FrameOptionCatalog::COLORS, 'allowLegacy' => true]);
            } elseif ($field['key'] === 'variants') {
                foreach ($field['fields'] as &$child) {
                    if ($child['key'] === 'color_code') {
                        $child['type'] = 'color';
                    }
                    if ($child['key'] === 'image_indices') {
                        $child['hidden'] = true; // Preserve old mappings; new UI uses stable photo identities.
                    }
                    if ($child['key'] === 'sizes') {
                        $child['fields'][] = self::stockStatus();
                    }
                }
                unset($child);
                $field['fields'][] = $f('image_ids', 'Color photographs', 'images', ['maxItems' => 10]);
                $field['fields'][] = self::stockStatus();
                $field['fields'][] = $f('sort_order', 'Sort order', 'number', ['min' => 0, 'step' => '1']);
            } elseif (in_array($field['key'], ['size_volume_variants', 'eye_hygiene_variants'], true)) {
                foreach ($field['fields'] as &$child) {
                    if ($child['key'] === 'image_index') $child['hidden'] = true;
                }
                unset($child);
                $field['fields'][] = $f('image_ids', 'Option photograph', 'images', ['maxItems' => 1]);
            } elseif ($field['key'] === 'lens_colors') {
                foreach ($field['fields'] as &$child) {
                    if ($child['key'] === 'color_code') {
                        $child['type'] = 'color';
                    }
                }
                unset($child);
            }
        }
        unset($field);
        if ($type !== 'contact_lens') {
            return $fields;
        }
        // The current seller Details tab no longer edits the legacy free-text ranges.
        foreach ($fields as &$field) {
            if (in_array($field['key'], ['base_curve_options', 'diameter_options', 'powers_range'])) {
                $field['hidden'] = true;
            }
        }
        unset($field);
        $fields[] = $f('prescription_values', 'Prescription options', 'prescription', ['maxItems' => 1000, 'fields' => [
            $f('field_type', 'Parameter', 'select', ['required' => true, 'options' => ['pwr', 'sph', 'cyl', 'axis', 'base_curve', 'diameter']]),
            $f('value', 'Value', 'text', ['required' => true, 'maxLength' => 50]),
            $f('label', 'Display label', 'text', ['maxLength' => 100]),
            $f('eye_type', 'Eye', 'select', ['options' => ['right', 'left', 'both']]),
            $f('is_active', 'Active option', 'boolean'),
            $f('sort_order', 'Sort order', 'number', ['step' => '1']),
        ]]);
        $fields[] = $f('variants', 'Color variations', 'rows', ['fields' => [
            $f('color_name', 'Color name', 'text', ['required' => true, 'maxLength' => 255]),
            $f('color_code', 'Hex color (#RRGGBB)', 'color', ['pattern' => '#[0-9A-Fa-f]{6}']),
            $f('price', 'Price (EUR)', 'number', ['min' => 0, 'step' => '0.01']),
            $f('stock_quantity', 'Quantity to allocate to this option', 'number', ['required' => true, 'min' => 0, 'step' => '1']),
            self::stockStatus(), $f('image_ids', 'Color photographs', 'images', ['maxItems' => 10]),
            $f('is_default', 'Default color', 'boolean'),
            $f('sort_order', 'Sort order', 'number', ['min' => 0, 'step' => '1']),
        ]]);
        $fields[] = $f('contact_lens_packs', 'Packs and pricing', 'rows', ['fields' => [
            $f('quantity', 'Lenses per box', 'number', ['required' => true, 'min' => 1, 'step' => '1']),
            $f('price', 'Pack price (EUR)', 'number', ['min' => 0, 'step' => '0.01']),
            $f('image_ids', 'Pack photographs', 'images', ['maxItems' => 10]),
            $f('variant_keys', 'Available colors (empty means all)', 'variant-multiple'),
        ]]);
        $fields[] = $f('contact_lens_qty_options', 'Purchase quantities', 'integer-list', ['maxItems' => 100]);
        $fields[] = $f('contact_lens_colour_stock', 'Stock by pack and color', 'rows', ['fields' => [
            $f('pack_quantity', 'Lenses per box', 'pack-select', ['required' => true]),
            $f('variant_key', 'Color variation', 'variant-select', ['required' => true]),
            $f('stock_quantity', 'Quantity to allocate to this pack/color', 'number', ['required' => true, 'min' => 0, 'step' => '1']),
        ]]);

        return $fields;
    }
}
