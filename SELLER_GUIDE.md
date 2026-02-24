# Seller Dashboard - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [Category Lens Configuration](#category-lens-configuration)
3. [Menu Navigation Guide](#menu-navigation-guide)
4. [How It Works](#how-it-works)

---

## Overview

The Seller Dashboard is your control center for managing your optical products store. This guide explains every feature and menu item available to sellers.

---

## Category Lens Configuration

### What is Category Lens Configuration?

**Location:** `/category-lens-config`  
**Purpose:** Configure which lens customization options (types, treatments, coatings, thickness) are available for products in each category.

### Why is This Important?

When a buyer views a product (like eyeglasses) and clicks "Add to Cart", a customization popup appears. This popup shows lens options based on:
1. **Category-specific configuration** (what you set here) - **Takes Priority**
2. **Global lens options** (fallback if no category config exists)

By configuring lens options per category, you can:
- Control which lens types appear for different product categories
- Set different pricing for lens options per category
- Offer category-specific lens treatments and coatings
- Manage lens thickness options per category

### How to Use Category Lens Configuration

#### Step 1: Access the Page
1. Log into your seller account
2. Click **"Lens Configuration"** in the sidebar menu
3. You'll see a list of all product categories

#### Step 2: Configure a Category
1. Find the category you want to configure (e.g., "Eyeglasses", "Sunglasses")
2. Click the **"Configure"** button next to the category name
3. The category will expand to show configuration options

#### Step 3: Select Lens Options

You'll see 5 sections of options:

##### 1. **Lens Types**
- Examples: "Distance Vision", "Near Vision", "Progressive"
- Shows price adjustment (e.g., "+$44.98")
- Check the boxes for lens types you want to offer in this category

##### 2. **Treatments**
- Examples: "Anti-Reflective", "Blue Light Filter", "UV Protection"
- Shows price for each treatment
- Select treatments available for this category

##### 3. **Coatings**
- Examples: "Hard Coating", "Anti-Scratch", "Hydrophobic"
- Shows price adjustment
- Choose coatings to offer

##### 4. **Thickness Materials**
- Examples: "Standard", "Thin", "Ultra-Thin"
- Shows material price
- Select thickness materials available

##### 5. **Thickness Options**
- Examples: "1.50", "1.56", "1.59", "1.67"
- Shows thickness value
- Choose thickness options to offer

#### Step 4: Save Configuration
1. After selecting all desired options, click **"Save Configuration"**
2. A success message will appear
3. The configuration is now active for all products in that category

### Where Do These Options Appear?

**In the Buyer Interface:**

1. **Product Detail Page:**
   - Buyer clicks on a product (e.g., eyeglasses)
   - Clicks "Add to Cart" or "Customize"
   - A popup modal appears

2. **Customization Modal:**
   - The modal shows lens customization steps
   - **Step 1: Lens Type Selection**
     - Shows only the lens types you configured for that product's category
     - Example: If you configured "Distance Vision", "Near Vision", and "Progressive" for "Eyeglasses" category, only these 3 will appear
   
   - **Step 2: Prescription Entry**
     - Buyer enters SPH, CYL, AXIS, PD values
     - For Progressive lenses, also shows H (height) field
   
   - **Step 3: Lens Thickness**
     - Shows only the thickness materials and options you configured
     - Displays recommendations based on prescription
   
   - **Step 4: Treatments & Coatings**
     - Shows only the treatments and coatings you configured for that category
     - Displays prices you set

3. **Order Summary:**
   - Left sidebar shows selected options with prices
   - Total price updates automatically
   - Includes shipping and coupon options

### Example Workflow

**Scenario:** You want to offer different lens options for "Eyeglasses" vs "Sunglasses"

1. **For Eyeglasses Category:**
   - Configure: Distance Vision, Near Vision, Progressive
   - Treatments: Anti-Reflective, Blue Light Filter
   - Coatings: Hard Coating, Anti-Scratch
   - Thickness: 1.50, 1.56, 1.59, 1.67

2. **For Sunglasses Category:**
   - Configure: Distance Vision only (no reading/progressive needed)
   - Treatments: UV Protection, Polarized
   - Coatings: Anti-Reflective
   - Thickness: 1.50, 1.56

When buyers view:
- An eyeglass product → They see all progressive options, reading options, etc.
- A sunglass product → They only see distance vision and sunglass-specific treatments

---

## Menu Navigation Guide

### Dashboard Menu Items

#### 1. **Dashboard** (`/dashboard`)
- **Purpose:** Overview of your store's performance
- **Shows:**
  - Total sales
  - Recent orders
  - Product statistics
  - Revenue charts
  - Quick actions

#### 2. **Products** (`/products`)
- **Purpose:** Manage all your products
- **Features:**
  - View all products (active/inactive)
  - Create new products
  - Edit existing products
  - Delete products
  - Toggle product status (active/inactive)
  - Filter by category, type, status
  - Search products

- **Product Types Supported:**
  - Frames (Eyeglasses)
  - Sunglasses
  - Contact Lenses
  - Eye Hygiene Products
  - Accessories

- **Product Creation/Edit:**
  - Basic info (name, description, price, SKU)
  - Category selection
  - Product images (upload directly or via URL)
  - Stock management
  - Variants (sizes, colors, etc.)
  - Product-specific fields:
    - **Frames:** Shape, material, color, gender
    - **Contact Lenses:** Base curve, diameter, power range
    - **Eye Hygiene:** Size, volume, pack type

#### 3. **Orders** (`/orders`)
- **Purpose:** Manage customer orders
- **Features:**
  - View all orders
  - Filter by status (pending, processing, shipped, delivered, cancelled)
  - View order details
  - Update order status
  - Print invoices
  - View customer information
  - Track order history

- **Order Statuses:**
  - **Pending:** New order, awaiting processing
  - **Processing:** Order is being prepared
  - **Shipped:** Order has been shipped
  - **Delivered:** Order delivered to customer
  - **Cancelled:** Order cancelled

#### 4. **Lens Configuration** (`/category-lens-config`)
- **Purpose:** Configure lens options per category
- **Features:**
  - View all categories
  - Configure lens types per category
  - Configure treatments per category
  - Configure coatings per category
  - Configure thickness materials per category
  - Configure thickness options per category
  - See summary of configured options

- **See [Category Lens Configuration](#category-lens-configuration) section above for detailed guide**

#### 5. **Field Configuration** (`/category-field-config`)
- **Purpose:** Configure custom fields for product categories
- **Features:**
  - Set which fields are required/optional for each category
  - Customize field labels
  - Set field visibility
  - Configure validation rules

#### 6. **Promotions** (`/promotions`)
- **Purpose:** Create and manage promotional campaigns
- **Features:**
  - Create promotional campaigns
  - Set discount rules
  - Schedule promotions
  - Track promotion performance

#### 7. **Announcements** (`/announcements`)
- **Purpose:** Create store announcements
- **Features:**
  - Create announcements for customers
  - Set announcement visibility
  - Schedule announcements
  - Manage announcement display

#### 8. **Banners** (`/banners`)
- **Purpose:** Manage store banners
- **Features:**
  - Create banner images
  - Set banner placement
  - Schedule banner display
  - Link banners to products/categories

#### 9. **Coupons** (`/coupons`)
- **Purpose:** Create and manage discount coupons
- **Features:**
  - Create new coupons
  - Set discount type (percentage or fixed amount)
  - Set minimum purchase amount
  - Set usage limits
  - Set expiration dates
  - View coupon usage statistics
  - Enable/disable coupons

- **Coupon Types:**
  - **Percentage Discount:** e.g., 10% off
  - **Fixed Amount:** e.g., $5 off
  - **Free Shipping:** Free shipping coupon

#### 10. **Store** (`/store`)
- **Purpose:** Manage your store profile
- **Features:**
  - Store name and description
  - Contact information (email, phone)
  - Store logo/profile image
  - Banner image
  - Theme colors
  - Social media links
  - Store policies
  - Shipping settings
  - Payment settings

#### 11. **Store Settings** (`/store/settings`)
- **Purpose:** Manage your store profile and settings
- **Features:**
  - Store name and description
  - Contact information (email, phone)
  - Store logo/profile image
  - Banner image
  - Theme colors
  - Social media links
  - Store policies
  - Shipping settings
  - Payment settings

#### 12. **Analytics** (`/analytics`)
- **Purpose:** View store performance metrics
- **Features:**
  - Sales reports
  - Product performance
  - Customer analytics
  - Revenue trends
  - Order statistics
  - Export reports

#### 13. **Messages** (`/messages`)
- **Purpose:** Communicate with customers
- **Features:**
  - View customer messages
  - Reply to inquiries
  - Manage conversations
  - Message notifications

#### 14. **Profile** (`/profile`)
- **Purpose:** Manage your seller account
- **Features:**
  - Update personal information
  - Change password
  - Update profile picture
  - Notification preferences
  - Account settings

---

## How It Works

### Data Flow: Category Lens Configuration

```
1. Seller Configures Category
   └─> Selects lens types, treatments, coatings, etc. for "Eyeglasses" category
       └─> Saves to database (store_category_lens_types, store_category_lens_treatments, etc.)

2. Buyer Views Product
   └─> Clicks on an eyeglass product
       └─> Product belongs to "Eyeglasses" category

3. Buyer Clicks "Add to Cart"
   └─> Customization modal opens
       └─> Frontend requests lens options for this product
           └─> Backend checks:
               ├─> Does this product's category have lens config? → YES
               │   └─> Returns configured options for this category
               └─> NO → Returns all global lens options (fallback)

4. Buyer Sees Options
   └─> Only sees options configured for that category
       └─> Selects options and adds to cart
           └─> Cart item includes all selected lens configurations
```

### Database Structure

The system uses pivot tables to link stores, categories, and lens options:

- `store_category_lens_types` - Links stores, categories, and lens types
- `store_category_lens_treatments` - Links stores, categories, and treatments
- `store_category_lens_coatings` - Links stores, categories, and coatings
- `store_category_lens_thickness_materials` - Links stores, categories, and thickness materials
- `store_category_lens_thickness_options` - Links stores, categories, and thickness options

### Priority System

When a buyer views a product, the system checks lens options in this order:

1. **Category-Specific Configuration** (Highest Priority)
   - Checks if the product's category has lens configuration
   - If yes, uses those options

2. **Parent Category Configuration**
   - If no config for current category, checks parent category
   - Continues up the category tree

3. **Global Options** (Fallback)
   - If no category config found, shows all active global lens options

---

## Best Practices

### Category Lens Configuration

1. **Configure Before Adding Products**
   - Set up lens configurations for your categories before adding products
   - This ensures products show correct options immediately

2. **Category-Specific Offerings**
   - Use different configurations for different product types
   - Eyeglasses might need progressive options, sunglasses might not

3. **Regular Updates**
   - Review and update configurations as you add new lens options
   - Keep prices updated to reflect current costs

4. **Test in Buyer View**
   - After configuring, test by viewing a product as a buyer
   - Verify that only configured options appear

### Product Management

1. **Complete Product Information**
   - Fill in all relevant fields for each product type
   - Add multiple high-quality images
   - Write detailed descriptions

2. **Stock Management**
   - Keep stock quantities updated
   - Set appropriate stock status (in_stock, out_of_stock, backorder)

3. **Product Variants**
   - Use variants for different sizes, colors, or models
   - Set default variant for each product

### Order Management

1. **Quick Response**
   - Process orders promptly
   - Update order status as you progress
   - Communicate with customers if needed

2. **Order Tracking**
   - Update status when shipping
   - Add tracking numbers when available

---

## Troubleshooting

### Lens Options Not Appearing in Buyer View

**Problem:** Configured lens options don't show in the buyer's customization popup

**Solutions:**
1. Verify the product is assigned to the correct category
2. Check that you saved the category configuration
3. Ensure lens options are marked as "active" in the system
4. Clear browser cache and test again
5. Check browser console for errors

### Configuration Not Saving

**Problem:** Clicking "Save Configuration" doesn't work

**Solutions:**
1. Check internet connection
2. Verify you're logged in as a seller
3. Check browser console for error messages
4. Try refreshing the page and reconfiguring

### Wrong Options Showing

**Problem:** Buyer sees options from a different category

**Solutions:**
1. Verify product category assignment
2. Check if parent category has conflicting configuration
3. Review category hierarchy
4. Ensure you're configuring the correct category

---

## Support

If you need help with any feature:
1. Check this guide first
2. Review the error messages in the interface
3. Contact system administrator
4. Check system logs for detailed error information

---

## Quick Reference

### Category Lens Config Checklist

- [ ] Access Lens Configuration page
- [ ] Select category to configure
- [ ] Choose lens types (at least one)
- [ ] Select treatments (optional)
- [ ] Select coatings (optional)
- [ ] Choose thickness materials (optional)
- [ ] Choose thickness options (optional)
- [ ] Click "Save Configuration"
- [ ] Verify success message
- [ ] Test in buyer view

### Product Creation Checklist

- [ ] Enter product name and description
- [ ] Select category
- [ ] Set price and stock
- [ ] Upload product images
- [ ] Fill category-specific fields
- [ ] Create variants (if needed)
- [ ] Set product as active
- [ ] Save product

---

**Last Updated:** 2026-02-08  
**Version:** 1.0

