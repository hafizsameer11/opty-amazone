# Lens Area Coordinates Setup Guide

## Overview

To achieve accurate lens color overlay placement, you need to set precise lens area coordinates for each product. This guide explains how to do that.

## Method 1: Using Artisan Command (Quick Setup)

For products where you know the approximate lens positions, use the artisan command:

```bash
cd backend
php artisan products:set-lens-coordinates {product_id} \
  --left-x=27 --left-y=45 --left-width=20 --left-height=22 \
  --right-x=73 --right-y=45 --right-width=20 --right-height=22
```

**Parameters:**
- `product_id`: The ID of the product
- `--left-x`: Left lens X position (percentage from left, 0-100)
- `--left-y`: Left lens Y position (percentage from top, 0-100)
- `--left-width`: Left lens width (percentage, 0-100)
- `--left-height`: Left lens height (percentage, 0-100)
- `--right-x`: Right lens X position (percentage from left, 0-100)
- `--right-y`: Right lens Y position (percentage from top, 0-100)
- `--right-width`: Right lens width (percentage, 0-100)
- `--right-height`: Right lens height (percentage, 0-100)

**Example:**
```bash
php artisan products:set-lens-coordinates 1 \
  --left-x=25 --left-y=42 --left-width=22 --left-height=24 \
  --right-x=75 --right-y=42 --right-width=22 --right-height=24
```

## Method 2: Using LensAreaMarker Component (Visual Tool)

The `LensAreaMarker` component provides a visual interface to mark lens areas:

1. Import the component in your admin panel
2. Load the product image
3. Click and drag to mark the left and right lens areas
4. The coordinates are displayed in real-time
5. Save the coordinates

## Method 3: Direct Database Update

You can also update the coordinates directly in the database:

```sql
UPDATE products 
SET lens_area_coordinates = '{
  "left": {"x": 27, "y": 45, "width": 20, "height": 22, "shape": "ellipse", "borderRadius": 50},
  "right": {"x": 73, "y": 45, "width": 20, "height": 22, "shape": "ellipse", "borderRadius": 50}
}'
WHERE id = {product_id};
```

## Coordinate Format

```json
{
  "left": {
    "x": 27,        // Percentage from left edge (0-100)
    "y": 45,        // Percentage from top edge (0-100)
    "width": 20,    // Width as percentage (0-100)
    "height": 22,   // Height as percentage (0-100)
    "shape": "ellipse",  // "circle", "ellipse", or "rounded-rect"
    "borderRadius": 50  // Border radius percentage (for rounded-rect)
  },
  "right": {
    "x": 73,        // Percentage from left edge (0-100)
    "y": 45,        // Percentage from top edge (0-100)
    "width": 20,    // Width as percentage (0-100)
    "height": 22,   // Height as percentage (0-100)
    "shape": "ellipse",
    "borderRadius": 50
  }
}
```

## How to Find Coordinates

1. **Visual Inspection**: Look at the product image and estimate where the lenses are
2. **Image Editor**: Use an image editor to measure pixel positions and convert to percentages
3. **Browser DevTools**: 
   - Open product page in browser
   - Use browser dev tools to inspect image
   - Measure lens positions relative to image size
   - Convert to percentages

## Tips

- **X position**: For left lens, typically 20-30%. For right lens, typically 70-80%
- **Y position**: Usually around 40-50% from top (center of image)
- **Width/Height**: Typically 18-25% for most glasses
- **Shape**: Most glasses use "ellipse" for realistic look
- **Test**: After setting coordinates, test on frontend and adjust if needed

## Default Values

If no coordinates are set, the system uses these defaults:
- Left: x=27%, y=45%, width=20%, height=22%
- Right: x=73%, y=45%, width=20%, height=22%

These work reasonably well for most glasses but may need adjustment for specific products.

