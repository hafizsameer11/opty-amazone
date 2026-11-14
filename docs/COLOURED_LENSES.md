# Coloured contact lenses — how they work end to end

This document explains where the buyer's **"coloured lenses"** option comes from, how a
seller associates a product with it, how the buyer decides to show the colour picker, and
the gap in the seller UI for creating the individual lens colours.

No code was changed to produce this document; it is an investigation of the current state.

## What "coloured lenses" actually is

It is **not a product type and not a toggle**. It is a **sub-category** of the main
*Contact Lenses* category, created by the category seeder.

`backend/database/seeders/CategorySeeder.php:267`

```text
slug:      coloured-lenses
name:      "coloured lenses"
name_it:   "Lenti colorate"
parent_id: <Contact Lenses>
sort_order: 4
is_active: true
```

It therefore sits as a sibling of *Daily / Weekly / Monthly* under *Contact Lenses*:

```text
Contact Lenses (slug: contact-lenses)
├── Daily      (slug: daily)    → Spherical, Astigmatism
├── Weekly     (slug: weakly)   → Spherical, Astigmatism
├── Monthly    (slug: monthly)  → Spherical, Astigmatism
└── Coloured lenses (slug: coloured-lenses)   ← this one
```

**The option is seeded, not seller-created.** The buyer surfaces it purely because it is a
child category:

- Header mega-menu renders a category's children — `frontend-buyer/components/layout/Header.tsx:169`
- Header search-bar category `<select>` flattens roots + children — `frontend-buyer/components/layout/Header.tsx:183`

## How a seller associates a product with it

There is no separate control. The seller assigns the product to the sub-category.

| Where | Path | Control |
| --- | --- | --- |
| Create | Sidebar → Products → **Create contact lenses**, `/products/new/contact-lenses` | **Sub Category** dropdown → *coloured lenses* (`page.tsx:186`) |
| Edit | `/products/[id]/edit/contact-lenses` → **Product Details** tab | **Sub Category** dropdown (`page.tsx:214`) |

The dropdown is `frontend-seller/components/products/ContactLensCategorySelect.tsx`; it lists
the children of the main *Contact Lenses* category via
`frontend-seller/lib/contact-lens-categories.ts:3` (`getContactLensSubCategories`).

A second **Lens Type** dropdown only appears when the chosen sub-category itself has children
(Daily/Weekly/Monthly do; *coloured lenses* has none, so only one select is shown —
`ContactLensCategorySelect.tsx:64`).

### If "coloured lenses" is missing from the seller dropdown

The category row is absent, inactive, or not parented to *Contact Lenses* in that database.
It requires `CategorySeeder` to have been run in that environment. Nothing in the seller UI
creates the category itself.

## What the buyer does with it

`frontend-buyer/components/products/ContactLensConfiguration.tsx:211` computes `isColouredLens`.
Colour-lens mode is enabled when **any** of the following is true:

1. the product's **category or sub-category** slug/name matches `colo(u)r(s)`, `coloured`
   or `colored` — assigning the *coloured lenses* sub-category satisfies this;
2. `product.contact_lens_color` is non-empty;
3. `contact_lens_unit_config` packs are configured **and** colour variants exist.

Note that only condition 1 or 2 is needed to get the colour-lens *layout*; the actual colour
picker additionally requires colour variants to exist, because it renders only when
`coloursForSelectedPack.length > 0` (`ContactLensConfiguration.tsx:838`).

## The other seller fields

### Contact Lens Color

A free-text input in the **"Contact Lens Details"** block —
`frontend-seller/components/products/SimplifiedProductOptions.tsx:85`. It is rendered
unconditionally for `product_type === 'contact_lens'`, so it appears on both the create and
edit contact-lens pages.

On the *generic* product form it is instead gated by the category field configuration key
`contact_lens_color` — `frontend-seller/components/products/CategoryProductForm.tsx:163`,
configured at `/category-field-config`.

### Colours and per-pack colour stock

`/products/[id]/edit/contact-lenses` → **"Pack pricing"** tab —
`frontend-seller/components/products/ContactLensPackUnitsEditor.tsx` (mounted at
`edit/contact-lenses/page.tsx:189`). It lets the seller:

- define pack sizes (units per box) and optional per-pack price/images;
- tick which colours apply to each pack size (`togglePackColour`, line 123);
- set pack × colour stock (`setColourStockQty`, line 137).

**It cannot create colours.** It only reads variants that already carry a `color_name`:

```ts
// ContactLensPackUnitsEditor.tsx:79
const rows = await productService.getVariants(productId);
setColourVariants(rows.filter((v) => Boolean(v.color_name)));
```

## The gap: creating the colours themselves

The editor that *creates* colour variants (name + hex + images + stock) is
`frontend-seller/components/products/ColorVariationsManager.tsx`. It is wired **only** into
`UnifiedProductForm`, which is used by:

- the **eyeglasses** edit flow (`/products/[id]/edit/eye-glasses`),
- the **sunglasses** edit flow (`/products/[id]/edit/sun-glasses`),
- the generic **create** page (`/products/new/edit`, via `DraftColorVariationsEditor`,
  `UnifiedProductForm.tsx:393`).

The contact-lens flows are different:

- `frontend-seller/app/products/[id]/edit/contact-lenses/page.tsx:25` has exactly three tabs —
  `details` | `prescription` | `packs`. There is no colour-variation editor.
- `frontend-seller/app/products/new/contact-lenses/page.tsx` renders only
  `SimplifiedProductOptions` — no colour-variation editor at create time either.

**Therefore there is currently no seller UI to create the individual lens colour variants for
a contact-lens product.** The Pack pricing tab can only reference colours that already exist
on the product, and the buyer's colour picker stays empty until at least one colour variant
exists. Setting only the *coloured lenses* sub-category produces the colour-lens layout with
no selectable colours.

## Not the place to look

`/category-lens-config` (**"Lens Configuration"**) configures per-category **lens types,
treatments, coatings and thickness** for frames. It has nothing to do with lens colours and
is not where a "coloured lens" is defined.

## Reference map

| Concern | Location |
| --- | --- |
| Category seed (`coloured-lenses`) | `backend/database/seeders/CategorySeeder.php:267` |
| Seller sub-category dropdown | `frontend-seller/components/products/ContactLensCategorySelect.tsx` |
| Sub-category tree helpers | `frontend-seller/lib/contact-lens-categories.ts` |
| Create contact lens | `frontend-seller/app/products/new/contact-lenses/page.tsx` |
| Edit contact lens (3 tabs) | `frontend-seller/app/products/[id]/edit/contact-lenses/page.tsx` |
| Contact lens detail fields | `frontend-seller/components/products/SimplifiedProductOptions.tsx:70` |
| Contact Lens Color (generic form) | `frontend-seller/components/products/CategoryProductForm.tsx:163` |
| Packs + per-pack colour stock | `frontend-seller/components/products/ContactLensPackUnitsEditor.tsx` |
| Colour variant creator (frames only) | `frontend-seller/components/products/ColorVariationsManager.tsx` |
| Buyer colour-lens detection | `frontend-buyer/components/products/ContactLensConfiguration.tsx:211` |
| Buyer dropdown source | `frontend-buyer/components/layout/Header.tsx:169`, `:183` |
