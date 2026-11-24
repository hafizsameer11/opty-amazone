<?php

namespace App\Services\Optical;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Validation\ValidationException;

class ProductOptions
{
    /**
     * Returns the stock entered on option rows.  The CRM must never ask an
     * operator to re-enter a second "total allocation" for a colour/size
     * product: this calculated value is the allocation.
     */
    public static function allocation(array $fields): ?int
    {
        $rows = $fields['variants'] ?? $fields['size_volume_variants'] ?? [];
        if (! $rows) {
            return null;
        }
        $total = 0;
        foreach ($rows as $row) {
            $total += ! empty($row['sizes']) ? array_sum(array_column($row['sizes'], 'stock_quantity')) : (int) ($row['stock_quantity'] ?? 0);
        }
        return $total;
    }

    public static function persist(Product $product, array $fields, array $map, array $images): array
    {
        $visited = [];
        foreach (['variants' => 'variants', 'size_volume_variants' => 'sizeVolumeVariants', 'eye_hygiene_variants' => 'eyeHygieneVariants'] as $kind => $relation) {
            foreach ($fields[$kind] ?? [] as $position => $row) {
                $key = $row['option_key'];
                $visited[] = $key;
                $sizes = $row['sizes'] ?? [];
                unset($row['option_key'],$row['sizes']);
                $stock = $sizes ? array_sum(array_column($sizes, 'stock_quantity')) : (int) ($row['stock_quantity'] ?? 0);
                if (isset($row['image_index'])) {
                    $url = $images[$row['image_index'] - 1] ?? null;
                    if (! $url) {
                        throw ValidationException::withMessages(['product.'.$kind => 'Choose an available product photo number.']);
                    }
                    if ($kind === 'variants') {
                        $row['images'] = [$url];
                    } else {
                        $row['image_url'] = $url;
                    }
                }
                if ($kind === 'variants' && array_key_exists('image_indices', $row)) {
                    $row['images'] = [];
                    foreach (array_unique($row['image_indices'] ?? []) as $index) {
                        $url = $images[(int) $index - 1] ?? null;
                        if (! $url) {
                            throw ValidationException::withMessages(['product.variants' => 'Choose available product photo numbers.']);
                        }
                        $row['images'][] = $url;
                    }
                }
                if (array_key_exists('image_ids', $row)) {
                    $selectedImages = array_map(function ($id) use ($images) {
                        if (!isset($images[$id])) throw ValidationException::withMessages(['product.variants' => 'Choose photos belonging to this seller publication.']);
                        return $images[$id];
                    }, $row['image_ids'] ?? []);
                    if ($kind === 'variants') $row['images'] = $selectedImages;
                    else $row['image_url'] = $selectedImages[0] ?? null;
                }
                unset($row['image_index'], $row['image_indices'], $row['image_ids']);
                $old = $map[$key] ?? null;
                if ($old && $old['kind'] !== $kind) {
                    throw ValidationException::withMessages(['product.'.$kind => 'Option identity cannot change category.']);
                }
                $model = $old ? $product->$relation()->lockForUpdate()->findOrFail($old['id']) : $product->$relation()->make();
                if ($kind !== 'eye_hygiene_variants') {
                    $row['stock_quantity'] = (int) ($model->stock_quantity ?? 0) + $stock;
                    $row['stock_status'] = $row['stock_status'] ?? ($row['stock_quantity'] > 0 ? 'in_stock' : 'out_of_stock');
                }
                if ($kind === 'variants') {
                    // A colour selects imagery and stock, never a second price.
                    $row['price'] = null;
                    foreach (['barcode' => 'Barcode', 'purchase_code' => 'Purchase code'] as $column => $label) {
                        $value = trim((string) ($row[$column] ?? ''));
                        if ($value === '') {
                            $prefix = $column === 'barcode' ? 'BC' : 'PC';
                            $value = sprintf('%s-%d-%s', $prefix, $product->id, strtoupper(substr(str_replace('-', '', $key), 0, 10)));
                        }
                        $duplicate = ProductVariant::query()->where($column, $value);
                        if ($model->exists) {
                            $duplicate->whereKeyNot($model->getKey());
                        }
                        if ($duplicate->exists()) {
                            throw ValidationException::withMessages(["product.variants.$position.$column" => "$label is already used by another colour variation."]);
                        }
                        $row[$column] = $value;
                    }
                } else {
                    $row['price'] = $row['price'] ?? $model->price ?? $product->price;
                }
                $row['sort_order'] = $row['sort_order'] ?? $position;
                if ($kind === 'variants' && ! empty($row['is_default'])) {
                    $product->variants()->update(['is_default' => false]);
                }
                $model->fill($row);
                $model->save();
                $map[$key] = ['kind' => $kind, 'id' => $model->id];
                foreach ($sizes as $size) {
                    $sk = $size['option_key'];
                    $visited[] = $sk;
                    unset($size['option_key']);
                    $oldSize = $map[$sk] ?? null;
                    if ($oldSize && ($oldSize['kind'] !== 'sizes' || $oldSize['parent'] !== $model->id)) {
                        throw ValidationException::withMessages(['product.variants' => 'Size identity cannot be moved between colors.']);
                    }
                    $sizeModel = $oldSize ? $product->frameSizes()->where('product_variant_id', $model->id)->lockForUpdate()->findOrFail($oldSize['id']) : $product->frameSizes()->make(['product_variant_id' => $model->id]);
                    $size['stock_quantity'] = (int) ($sizeModel->stock_quantity ?? 0) + (int) $size['stock_quantity'];
                    $size['stock_status'] = $size['stock_status'] ?? ($size['stock_quantity'] > 0 ? 'in_stock' : 'out_of_stock');
                    // Match the Seller Panel's compact size notation without losing free-text labels.
                    $size['size_label'] = trim($size['size_label']);
                    $compact = preg_replace('/\s+/', '', $size['size_label']);
                    preg_match('/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/', $compact, $dimensions);
                    foreach (['lens_width', 'bridge_width', 'temple_length'] as $index => $dimension) {
                        $size[$dimension] = $size[$dimension] ?? (float) ($dimensions[$index + 1] ?? 0);
                    }
                    $sizeModel->fill($size);
                    $sizeModel->save();
                    $map[$sk] = ['kind' => 'sizes', 'id' => $sizeModel->id, 'parent' => $model->id];
                }
            }
        }
        if (array_diff(array_keys($map), $visited)) {
            throw ValidationException::withMessages(['product.variants' => 'Existing Vista options cannot be removed from an allocation update. Manage retirement in the Vista Seller Panel.']);
        }

        $product->syncStockFromVariants();

        return $map;
    }
}
