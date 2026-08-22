<?php

namespace App\Services\Product;

use App\Models\EyeHygieneVariant;
use App\Models\Product;
use App\Models\ProductSizeVolume;
use Illuminate\Support\Facades\DB;

class EyeHygieneVariantService
{
    /**
     * Create selectable size/volume rows from legacy comma-separated product.size_volume.
     */
    public function ensureLegacySizeVolumes(Product $product): void
    {
        if ($product->product_type !== 'eye_hygiene') {
            return;
        }

        if ($product->sizeVolumeVariants()->exists()) {
            return;
        }

        $raw = trim((string) $product->size_volume);
        if ($raw === '') {
            return;
        }

        $parts = preg_split('/[,;|\/]+/', $raw) ?: [];
        $parts = array_values(array_filter(array_map('trim', $parts), fn ($v) => $v !== ''));
        if ($parts === []) {
            return;
        }

        $stockEach = max(0, (int) floor(((int) $product->stock_quantity) / count($parts)));

        foreach ($parts as $index => $volume) {
            ProductSizeVolume::create([
                'product_id' => $product->id,
                'size_volume' => $volume,
                'pack_type' => $product->pack_type,
                'price' => $product->price,
                'compare_at_price' => $product->compare_at_price,
                'cost_price' => $product->cost_price,
                'stock_quantity' => $stockEach,
                'stock_status' => $product->stock_status,
                'expiry_date' => $product->expiry_date,
                'is_active' => true,
                'sort_order' => $index,
            ]);
        }
    }

    public function syncSizeVolumeVariants(Product $product, array $rows): void
    {
        DB::transaction(function () use ($product, $rows) {
            $keepIds = [];

            foreach ($rows as $index => $row) {
                if (!is_array($row)) {
                    continue;
                }

                $volume = trim((string) ($row['size_volume'] ?? ''));
                if ($volume === '') {
                    continue;
                }

                $payload = [
                    'size_volume' => $volume,
                    'pack_type' => $row['pack_type'] ?? null,
                    'price' => $row['price'] ?? $product->price,
                    'compare_at_price' => $row['compare_at_price'] ?? null,
                    'cost_price' => $row['cost_price'] ?? null,
                    'stock_quantity' => (int) ($row['stock_quantity'] ?? 0),
                    'stock_status' => $row['stock_status'] ?? 'in_stock',
                    'sku' => $row['sku'] ?? null,
                    'expiry_date' => $row['expiry_date'] ?? null,
                    'image_url' => $row['image_url'] ?? null,
                    'is_active' => array_key_exists('is_active', $row) ? (bool) $row['is_active'] : true,
                    'sort_order' => (int) ($row['sort_order'] ?? $index),
                ];

                if (!empty($row['id'])) {
                    $variant = ProductSizeVolume::where('product_id', $product->id)
                        ->where('id', $row['id'])
                        ->first();
                    if ($variant) {
                        $variant->update($payload);
                        $keepIds[] = $variant->id;
                        continue;
                    }
                }

                $created = ProductSizeVolume::create(array_merge($payload, [
                    'product_id' => $product->id,
                ]));
                $keepIds[] = $created->id;
            }

            ProductSizeVolume::where('product_id', $product->id)
                ->when($keepIds !== [], fn ($q) => $q->whereNotIn('id', $keepIds))
                ->delete();
        });
    }

    public function syncEyeHygieneVariants(Product $product, array $rows): void
    {
        DB::transaction(function () use ($product, $rows) {
            $keepIds = [];

            foreach ($rows as $index => $row) {
                if (!is_array($row)) {
                    continue;
                }

                $name = trim((string) ($row['name'] ?? ''));
                if ($name === '') {
                    continue;
                }

                $payload = [
                    'name' => $name,
                    'description' => $row['description'] ?? null,
                    'price' => $row['price'] ?? $product->price,
                    'image_url' => $row['image_url'] ?? null,
                    'is_active' => array_key_exists('is_active', $row) ? (bool) $row['is_active'] : true,
                    'sort_order' => (int) ($row['sort_order'] ?? $index),
                ];

                if (!empty($row['id'])) {
                    $variant = EyeHygieneVariant::where('product_id', $product->id)
                        ->where('id', $row['id'])
                        ->first();
                    if ($variant) {
                        $variant->update($payload);
                        $keepIds[] = $variant->id;
                        continue;
                    }
                }

                $created = EyeHygieneVariant::create(array_merge($payload, [
                    'product_id' => $product->id,
                ]));
                $keepIds[] = $created->id;
            }

            EyeHygieneVariant::where('product_id', $product->id)
                ->when($keepIds !== [], fn ($q) => $q->whereNotIn('id', $keepIds))
                ->delete();
        });
    }
}
