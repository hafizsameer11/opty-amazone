<?php

namespace App\Services\Optical;

use App\Http\Controllers\Seller\SellerProductPrescriptionDropdownController;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

final class ContactLensPublication
{
    public const KEYS = ['prescription_values', 'contact_lens_packs', 'contact_lens_qty_options', 'contact_lens_colour_stock'];

    public static function validate(array $fields, int $quantity): void
    {
        $variants = collect($fields['variants'] ?? [])->keyBy('option_key');
        $packs = collect($fields['contact_lens_packs'] ?? []);
        if ($packs->pluck('quantity')->unique()->count() !== $packs->count()) {
            self::invalid('Pack sizes must be unique.');
        }
        foreach ($packs as $pack) {
            foreach ($pack['variant_keys'] ?? [] as $key) {
                if (! $variants->has($key)) {
                    self::invalid('Choose a color belonging to this product.');
                }
            }
        }
        $seen = [];
        $stock = $fields['contact_lens_colour_stock'] ?? [];
        foreach ($stock as $row) {
            $pack = $packs->firstWhere('quantity', $row['pack_quantity']);
            $identity = $row['pack_quantity'].':'.$row['variant_key'];
            if (! $pack || ! $variants->has($row['variant_key']) || isset($seen[$identity])) {
                self::invalid('Pack/color stock must reference a unique existing pack and color.');
            }
            if (! empty($pack['variant_keys']) && ! in_array($row['variant_key'], $pack['variant_keys'], true)) {
                self::invalid('This color is not available for the selected pack.');
            }
            $seen[$identity] = true;
        }
        if ($stock) {
            if (array_sum(array_column($stock, 'stock_quantity')) !== $quantity) {
                self::invalid('Pack/color allocations must equal the chosen allocation.');
            }
            foreach ($variants as $key => $variant) {
                $total = collect($stock)->where('variant_key', $key)->sum('stock_quantity');
                if ($total !== (int) ($variant['stock_quantity'] ?? 0)) {
                    self::invalid('Pack/color allocations must also match each color allocation.');
                }
            }
        }
    }

    public static function persist(Product $product, array $fields, array $map, array $images, User $actor): void
    {
        if ($product->product_type !== 'contact_lens') {
            return;
        }
        if (array_key_exists('prescription_values', $fields)) {
            $values = array_map(function ($row) {
                unset($row['option_key']);
                return $row;
            }, $fields['prescription_values'] ?? []);
            $input = Request::create('/', 'POST', ['values' => $values]);
            $input->setUserResolver(fn () => $actor);
            $guard = Auth::guard();
            $previous = $guard->user();
            $guard->setUser($actor);
            try {
                // Reuse the seller's PWR/SPH normalization, eye rules and duplicate protection.
                $response = app(SellerProductPrescriptionDropdownController::class)->store($input, $product->id);
                if ($response->getStatusCode() >= 400) {
                    self::invalid($response->getData(true)['message'] ?? 'Invalid prescription options.');
                }
            } finally {
                $previous ? $guard->setUser($previous) : $guard->forgetUser();
            }
        }
        if (! array_key_exists('contact_lens_packs', $fields)) {
            return;
        }
        $old = $product->contact_lens_unit_config ?? [];
        $packs = [];
        foreach ($fields['contact_lens_packs'] ?? [] as $pack) {
            $photos = [];
            foreach ($pack['image_ids'] ?? [] as $id) {
                if (! isset($images[$id])) {
                    self::invalid('Choose photographs uploaded through this connection.');
                }
                $photos[] = $images[$id];
            }
            $variants = [];
            foreach ($pack['variant_keys'] ?? [] as $key) {
                $variants[] = $map[$key]['id'];
            }
            $packs[] = ['quantity' => (int) $pack['quantity'], 'price' => $pack['price'] ?? null,
                'images' => $photos, 'available_variant_ids' => $variants];
        }
        $stock = collect($old['colour_stock'] ?? [])->keyBy(fn ($r) => $r['pack_quantity'].':'.$r['variant_id'])->all();
        foreach ($fields['contact_lens_colour_stock'] ?? [] as $row) {
            $variantId = $map[$row['variant_key']]['id'];
            $key = $row['pack_quantity'].':'.$variantId;
            $stock[$key] = ['pack_quantity' => (int) $row['pack_quantity'], 'variant_id' => $variantId,
                'stock_quantity' => ($stock[$key]['stock_quantity'] ?? 0) + (int) $row['stock_quantity']];
        }
        foreach ($stock as $row) {
            $pack = collect($packs)->firstWhere('quantity', $row['pack_quantity']);
            if ($row['stock_quantity'] > 0 && (! $pack || (! empty($pack['available_variant_ids']) && ! in_array($row['variant_id'], $pack['available_variant_ids'])))) {
                self::invalid('A pack/color with remaining Vista stock cannot be removed.');
            }
        }
        $product->contact_lens_unit_config = ['packs' => $packs,
            'qty_options' => array_values(array_unique(array_map('intval', $fields['contact_lens_qty_options'] ?? []))),
            'colour_stock' => array_values($stock)];
        $product->save();
    }

    private static function invalid(string $message): never
    {
        throw ValidationException::withMessages(['product.contact_lens_packs' => $message]);
    }
}
