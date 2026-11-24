<?php

namespace App\Services\Optical;

use App\Http\Controllers\Seller\SellerProductPrescriptionDropdownController;
use App\Models\Product;
use App\Models\Category;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

final class ContactLensPublication
{
    public const KEYS = ['prescription_values', 'contact_lens_packs', 'contact_lens_qty_options', 'contact_lens_colour_stock'];

    /**
     * In a coloured-lens form, pack × colour rows are the source of truth for
     * each colour's stock. The client no longer has to type that same total in
     * a second colour row.
     */
    public static function withCalculatedColorStock(array $fields): array
    {
        if (! self::isColoredLens($fields) || ! array_key_exists('contact_lens_colour_stock', $fields)) {
            return $fields;
        }

        $totals = [];
        foreach ($fields['contact_lens_colour_stock'] ?? [] as $row) {
            $key = (string) ($row['variant_key'] ?? '');
            if ($key !== '') {
                $totals[$key] = ($totals[$key] ?? 0) + (int) ($row['stock_quantity'] ?? 0);
            }
        }
        foreach ($fields['variants'] ?? [] as $index => $variant) {
            $key = (string) ($variant['option_key'] ?? '');
            if (array_key_exists($key, $totals)) {
                $fields['variants'][$index]['stock_quantity'] = $totals[$key];
                $fields['variants'][$index]['stock_status'] = $totals[$key] > 0 ? 'in_stock' : 'out_of_stock';
            }
        }

        return $fields;
    }

    public static function validate(array $fields): void
    {
        $colored = self::isColoredLens($fields);
        $variants = collect($fields['variants'] ?? [])->keyBy('option_key');
        $packs = collect($fields['contact_lens_packs'] ?? []);
        if ($packs->pluck('quantity')->unique()->count() !== $packs->count()) {
            self::invalid('Pack sizes must be unique.');
        }
        foreach ($packs as $pack) {
            if (! $colored && ! empty($pack['variant_keys'])) {
                self::invalid('Standard contact lenses do not use color variations. Choose the coloured-lenses category to configure colors.');
            }
            foreach ($pack['variant_keys'] ?? [] as $key) {
                if (! $variants->has($key)) {
                    self::invalid('Choose a color belonging to this product.');
                }
            }
        }
        $seen = [];
        $stock = $fields['contact_lens_colour_stock'] ?? [];
        if (! $colored && $stock) {
            self::invalid('Standard contact lenses use a quantity per pack, not pack/color stock.');
        }
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
        // `allocated_quantity` is a transport/allocation value. It must not
        // become a second manually maintained total: each pack/colour row is
        // independently validated and its total is calculated before save.
        if (! $colored && $packs->contains(fn ($pack) => array_key_exists('stock_quantity', $pack))) {
            foreach ($packs as $pack) {
                if (! isset($pack['stock_quantity']) || (int) $pack['stock_quantity'] < 0) {
                    self::invalid('Enter a valid stock quantity for every pack.');
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
        // `$fields` here intentionally contains only the contact-lens
        // sub-form. Resolve colour-lens status from the persisted product so
        // an update retains (and adds to) existing pack/colour stock.
        $colored = self::isColoredProduct($product);
        // Product options are persisted immediately before this method. Read
        // the stored configuration again so an additive CRM publication never
        // drops the colour/pack stock recorded by the previous publication.
        $old = $product->fresh()->contact_lens_unit_config ?? [];
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
                'stock_quantity' => array_key_exists('stock_quantity', $pack) ? (int) $pack['stock_quantity'] : null,
                'images' => $photos, 'available_variant_ids' => $variants];
        }
        $stock = $colored
            ? collect($old['colour_stock'] ?? [])->keyBy(fn ($r) => $r['pack_quantity'].':'.$r['variant_id'])->all()
            : [];
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

        // Packs (or pack × colour rows) are the only stock inputs for a
        // contact-lens product. Keep the listing total derived from them so
        // it cannot disagree with a historical publication allocation value.
        $total = $colored
            ? array_sum(array_map(fn ($row) => (int) ($row['stock_quantity'] ?? 0), $stock))
            : array_sum(array_map(fn ($pack) => (int) ($pack['stock_quantity'] ?? 0), $packs));
        $product->forceFill([
            'stock_quantity' => $total,
            'stock_status' => $total > 0 ? 'in_stock' : 'out_of_stock',
        ])->save();
    }

    private static function invalid(string $message): never
    {
        throw ValidationException::withMessages(['product.contact_lens_packs' => $message]);
    }

    private static function isColoredLens(array $fields): bool
    {
        $category = Category::find($fields['sub_category_id'] ?? null);
        $seen = [];
        while ($category && ! isset($seen[$category->id])) {
            $seen[$category->id] = true;
            $source = strtolower(($category->slug ?? '').' '.($category->name ?? ''));
            if (preg_match('/\\bcolou?red\\b/', str_replace(['-', '_'], ' ', $source))) {
                return true;
            }
            $category = $category->parent;
        }

        return false;
    }

    private static function isColoredProduct(Product $product): bool
    {
        return self::isColoredLens(['sub_category_id' => $product->sub_category_id]);
    }
}
