# Database Seeding Instructions

## Overview

This project includes comprehensive seeders to populate the database with test data including:
- Categories (Frames, Sunglasses, Contact Lenses, Eye Hygiene, Accessories)
- Subscription Plans (Basic, Professional, Enterprise)
- Users (Admin, Buyers, Sellers)
- Stores (with proper seller setup)
- Products (30+ products for test seller, 5-20 for other sellers)

## Running the Seeders

### Option 1: Run All Seeders (Recommended)

```bash
cd backend
php artisan db:seed
```

This will run all seeders in the correct order:
1. Geographic data (Countries, States, Cities)
2. Categories
3. Subscription Plans
4. Users (Admin, Buyers, Sellers)
5. Stores (with subscriptions and statistics)
6. Products (for all stores)

### Option 2: Run Individual Seeders

```bash
# Seed categories only
php artisan db:seed --class=CategorySeeder

# Seed subscription plans only
php artisan db:seed --class=SubscriptionPlanSeeder

# Seed users only
php artisan db:seed --class=UserSeeder

# Seed stores only (requires users)
php artisan db:seed --class=StoreSeeder

# Seed products only (requires stores and categories)
php artisan db:seed --class=ProductSeeder
```

### Option 3: Fresh Migration + Seeding

To reset the database and seed fresh data:

```bash
php artisan migrate:fresh --seed
```

## Test Credentials

After seeding, you can use these test accounts:

### Admin
- **Email:** admin@optyamazone.com
- **Password:** password

### Buyer
- **Email:** buyer@test.com
- **Password:** password

### Seller (VisionPro Optics)
- **Email:** seller@test.com
- **Password:** password
- **Store:** VisionPro Optics
- **Products:** 30 products across all categories
- **Subscription:** Professional Plan

## What Gets Created

### Categories
- 5 main categories (Frames, Sunglasses, Contact Lenses, Eye Hygiene, Accessories)
- 12 sub-categories

### Users
- 1 Admin user
- 1 Test Buyer
- 1 Test Seller
- 10 Additional Buyers
- 5 Additional Sellers

### Stores
- **VisionPro Optics** (Test Seller's store)
  - Professional Plan subscription
  - Complete statistics
  - 30 products
- 5 Additional stores (one per seller)
  - Random subscriptions
  - Statistics
  - 5-20 products each

### Products
- **VisionPro Optics:** 30 products
  - Mix of frames, sunglasses, contact lenses, eye hygiene, and accessories
  - Realistic pricing
  - Product images
  - Complete specifications
- **Other Stores:** 5-20 products each

### Subscription Plans
- Basic Plan ($9.99/month)
- Professional Plan ($29.99/month)
- Enterprise Plan ($99.99/month)

## Notes

- All passwords are set to: `password`
- Products include realistic names, descriptions, and pricing
- Store statistics are automatically created
- Product counts in store statistics are updated after seeding
- The test seller store (VisionPro Optics) has the most complete setup

## Troubleshooting

If you encounter errors:

1. **Make sure migrations are run first:**
   ```bash
   php artisan migrate
   ```

2. **Check if geographic data exists:**
   ```bash
   php artisan db:seed --class=CountrySeeder
   php artisan db:seed --class=StateSeeder
   php artisan db:seed --class=CitySeeder
   ```

3. **Run seeders in order:**
   - Categories → Subscription Plans → Users → Stores → Products

