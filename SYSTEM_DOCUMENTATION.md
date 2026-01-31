# Colala API - Complete System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Seller Registration & Onboarding](#seller-registration--onboarding)
5. [Order & Payment Flow](#order--payment-flow)
6. [Core Modules & Components](#core-modules--components)
7. [Database Structure](#database-structure)
8. [API Endpoints Overview](#api-endpoints-overview)
9. [Key Features](#key-features)

---

## System Overview

**Colala** is a comprehensive marketplace platform built with Laravel 11 that connects buyers and sellers. The system supports:

- **Multi-vendor marketplace** with separate stores
- **Product and Service listings**
- **Order management** with escrow payment system
- **Seller onboarding** with multi-step verification
- **Real-time chat** between buyers and sellers
- **Loyalty points system**
- **Referral program**
- **Visual product search** using Google Cloud Vision
- **Subscription plans** for sellers
- **Dispute resolution** system
- **Wallet system** with multiple balance types

---

## Technology Stack

- **Framework**: Laravel 11 (PHP 8.2+)
- **Database**: MySQL/SQLite
- **Authentication**: Laravel Sanctum
- **Queue System**: Database queues
- **File Storage**: Local/Public storage
- **External Services**:
  - Google Cloud Vision API (product image search)
  - Flutterwave (payment gateway)
  - Apple IAP (subscription management)
- **Documentation**: Scribe/L5-Swagger

---

## System Architecture

### Directory Structure

```
app/
├── Console/          # Artisan commands
├── Http/
│   ├── Controllers/
│   │   ├── Api/      # Main API controllers
│   │   ├── Buyer/    # Buyer-specific controllers
│   │   └── Seller/   # Seller-specific controllers
│   └── Requests/     # Form validation requests
├── Models/           # Eloquent models (82 models)
├── Services/         # Business logic layer
│   ├── Buyer/       # Buyer services
│   └── Seller/      # Seller services
├── Mail/             # Email templates
├── Jobs/             # Queue jobs
└── Observers/        # Model observers

routes/
├── api.php          # Main API routes
├── seller.php       # Seller-specific routes
├── admin.php        # Admin routes
└── web.php          # Web routes
```

### Authentication Flow

- Uses **Laravel Sanctum** for API authentication
- Users have roles: `buyer`, `seller`, `admin`
- Token-based authentication with `auth:sanctum` middleware
- OTP verification for user registration

---

## Seller Registration & Onboarding

### Overview

The system provides **two seller registration flows**:

1. **Legacy 3-Step Registration** (`SellerRegistrationController`)
2. **Modern Multi-Step Onboarding** (`SellerOnboardingController`) - Recommended

### Flow 1: Legacy 3-Step Registration

#### Step 1: Basic Store Information
**Endpoint**: `POST /api/seller/register/step1`

**Data Collected**:
- Store name, email, phone, location
- Password
- Profile image & banner image
- Categories (multiple selection)
- Social media links
- Referral code (optional)

**Process**:
1. Checks if user exists with same email (unverified sellers can re-register)
2. Creates/updates User with role `seller`
3. Creates/updates Store record
4. Links categories to store
5. Uploads images to `storage/app/public/stores/{store_id}/`
6. Stores social links
7. Sends welcome email

**Response**: Returns `store_id` for next step

#### Step 2: Business Details & Documents
**Endpoint**: `POST /api/seller/register/{storeId}/step2`

**Data Collected**:
- Business registration details:
  - Registered name
  - Business type
  - NIN number
  - BN number
  - CAC number
- Documents (file uploads):
  - NIN document
  - CAC document
  - Utility bill
  - Store video

**Process**:
1. Validates store exists
2. Handles file uploads
3. Creates/updates `StoreBusinessDetail` record

#### Step 3: Addresses & Delivery Pricing
**Endpoint**: `POST /api/seller/register/{storeId}/step3`

**Data Collected**:
- Multiple store addresses (state, LGA, full address, opening hours)
- Delivery pricing rules (state, LGA, variant, price/free)
- Theme color

**Process**:
1. Creates multiple `StoreAddress` records
2. Creates multiple `StoreDeliveryPricing` records
3. Updates store theme color
4. Status set to "pending approval"

---

### Flow 2: Modern Onboarding (Recommended)

This is a more granular, step-by-step onboarding with progress tracking.

#### Initial Start (Public - No Auth)
**Endpoint**: `POST /api/auth/seller/start`

Creates user, store, and initial data. Returns authentication token.

#### Level 1: Basic Setup

**1.1 Basic Information** (Auto-completed on start)
- Store name, email, phone, location
- Password
- Categories & social links (optional)

**1.2 Profile Media**
**Endpoint**: `POST /api/seller/onboarding/level1/profile-media`
- Profile image
- Banner image

**1.3 Categories & Social Links**
**Endpoint**: `POST /api/seller/onboarding/level1/categories-social`
- Selected categories
- Social media links

#### Level 2: Business Verification

**2.1 Business Details**
**Endpoint**: `POST /api/seller/onboarding/level2/business-details`
- Registered name
- Business type
- NIN, BN, CAC numbers

**2.2 Documents**
**Endpoint**: `POST /api/seller/onboarding/level2/documents`
- NIN document
- CAC document
- Utility bill
- Store video

#### Level 3: Store Configuration

**3.1 Physical Store**
**Endpoint**: `POST /api/seller/onboarding/level3/physical-store`
- Has physical store (boolean)
- Store video

**3.2 Utility Bill**
**Endpoint**: `POST /api/seller/onboarding/level3/utility-bill`
- Utility bill document

**3.3 Addresses** (CRUD operations)
- **Create**: `POST /api/seller/onboarding/level3/address`
- **Update**: `PUT /api/seller/onboarding/level3/address/{id}`
- **Delete**: `DELETE /api/seller/onboarding/level3/address/{id}`
- **List**: `GET /api/seller/onboarding/store/addresses`

**3.4 Delivery Pricing** (CRUD operations)
- **Create**: `POST /api/seller/onboarding/level3/delivery`
- **Update**: `PUT /api/seller/onboarding/level3/delivery/{id}`
- **Delete**: `DELETE /api/seller/onboarding/level3/delivery/{id}`
- **List**: `GET /api/seller/onboarding/store/delivery`

**3.5 Theme**
**Endpoint**: `POST /api/seller/onboarding/level3/theme`
- Theme color (hex code)

#### Progress Tracking

**Get Progress**
**Endpoint**: `GET /api/seller/onboarding/progress`

Returns:
- Current level (1-3)
- Completion percentage
- Status (pending, in_progress, pending_review, approved, rejected)
- List of all steps with their status
- Rejection reasons (if any step is rejected)

**Submit for Review**
**Endpoint**: `POST /api/seller/onboarding/submit`

Changes status to `pending_review` for admin approval.

#### Onboarding Data Models

**StoreOnboardingStep** tracks each step:
- `store_id`
- `level` (1, 2, or 3)
- `key` (e.g., "level1.profile_media")
- `status` (pending, done, rejected)
- `completed_at`
- `rejection_reason`

**Store** model tracks overall progress:
- `onboarding_level` (1-3)
- `onboarding_percent` (0-100)
- `onboarding_status` (pending, in_progress, pending_review, approved, rejected)

---

## Order & Payment Flow

### Order Flow Overview

The system uses a **separate orders per store** model:
- When buyer adds items from multiple stores to cart, separate orders are created (one per store)
- Each order is independent and can be paid separately

### Step-by-Step Flow

#### 1. Cart Management
**Endpoints**:
- `GET /api/buyer/cart` - View cart
- `POST /api/buyer/cart/items` - Add item
- `POST /api/buyer/cart/items/{id}` - Update quantity
- `DELETE /api/buyer/cart/items/{id}` - Remove item
- `POST /api/buyer/cart/apply-coupon` - Apply coupon
- `POST /api/buyer/cart/apply-points` - Apply loyalty points

#### 2. Checkout Preview
**Endpoint**: `POST /api/buyer/checkout/preview`

**Request**:
```json
{
  "delivery_address_id": 1,
  "payment_method": "card" // or "wallet"
}
```

**Response**: Shows breakdown per store:
- Items total
- Shipping total
- Platform fee
- Discount total
- Grand total
- Per-store breakdown

#### 3. Place Order
**Endpoint**: `POST /api/buyer/checkout/place`

**Process**:
1. Validates cart items
2. Groups items by store
3. Creates separate `Order` records (one per store)
4. Creates `StoreOrder` for each order
5. Creates `OrderItem` for each product
6. Generates unique `order_no` (format: COL-YYYYMMDD-XXXXXX)
7. Sets initial status: `pending` (awaiting seller acceptance)

**Response**: Returns array of created orders

#### 4. Seller Order Acceptance

**View Pending Orders**
**Endpoint**: `GET /api/seller/store-orders/pending`

**Accept Order**
**Endpoint**: `POST /api/seller/store-orders/{storeOrderId}/accept`

**Request**:
```json
{
  "estimated_delivery_date": "2025-11-10",
  "delivery_method": "Express",
  "delivery_fee": 1500,
  "delivery_notes": "Will be delivered within 3 days"
}
```

**Process**:
1. Updates `StoreOrder` status to `accepted`
2. Sets delivery fee (locked after payment)
3. Updates order tracking
4. Sends notification to buyer

**Reject Order**
**Endpoint**: `POST /api/seller/store-orders/{storeOrderId}/reject`

**Request**:
```json
{
  "reason": "Out of stock"
}
```

#### 5. Payment

**Payment Methods**:
1. **Wallet Payment** (immediate)
2. **Card Payment** (via Flutterwave)

**Wallet Payment**
**Endpoint**: `POST /api/buyer/orders/{orderId}/pay`

**Process**:
1. Validates order is accepted
2. Checks wallet balance
3. Deducts from wallet
4. Creates transaction record
5. Creates escrow (status: `locked`)
6. Updates order payment status to `paid`

**Card Payment Flow**:
1. **Get Payment Info**: `GET /api/buyer/orders/{orderId}/payment-info`
2. Frontend initializes Flutterwave with amount
3. After successful payment, call: `POST /api/buyer/payment/confirmation`

**Request**:
```json
{
  "order_id": 1,
  "tx_id": "FLW-12345678",
  "amount": 11150.00
}
```

**Process**:
1. Validates payment
2. Updates order status
3. Creates transaction
4. Creates escrow

#### 6. Order Fulfillment

**Mark Out for Delivery**
**Endpoint**: `POST /api/seller/orders/{orderId}/out-for-deliver`

Updates `StoreOrder` status to `out_for_delivery`.

**Mark as Delivered**
**Endpoint**: `POST /api/seller/orders/{orderId}/delivered`

**Request**:
```json
{
  "delivery_code": "1234"
}
```

**Process**:
1. Validates delivery code
2. Updates `StoreOrder` status to `delivered`
3. **Unlocks escrow** - transfers funds to seller's wallet
4. Updates order tracking
5. Sends notifications

#### 7. Buyer Confirmation
**Endpoint**: `POST /api/buyer/orders/{storeOrderId}/confirm-delivered`

Buyer confirms delivery, completing the order cycle.

### Escrow System

**Purpose**: Hold payment until order is delivered

**Escrow Lifecycle**:
1. **Created**: When buyer pays (status: `locked`)
2. **Released**: When seller marks as delivered (status: `released`)

**Escrow Model**:
- `order_id` - Parent order
- `store_order_id` - Store-specific order
- `amount` - Total amount (including shipping)
- `shipping_fee` - Delivery fee
- `status` - locked | released
- `released_at` - Timestamp when released

**Escrow Release Process**:
1. When order marked as delivered
2. Escrow status updated to `released`
3. Funds added to seller's `shopping_balance` in wallet
4. Transaction record created for seller

---

## Core Modules & Components

### 1. User Management

**User Model** (`app/Models/User.php`):
- Roles: `buyer`, `seller`, `admin`
- Soft deletes enabled
- Global scope for visibility
- Relationships:
  - `store()` - One-to-one with Store
  - `wallet()` - One-to-one with Wallet
  - `orders()` - One-to-many with Order
  - `addresses()` - One-to-many with UserAddress
  - `chats()` - One-to-many with Chat

**Key Features**:
- OTP verification
- Referral system
- Online status tracking
- Store access management (for multi-user stores)

### 2. Store Management

**Store Model** (`app/Models/Store.php`):
- Belongs to User (owner)
- Has many Products, Services, Orders
- Many-to-many with Categories
- Relationships:
  - `businessDetails()` - One-to-one
  - `addresses()` - One-to-many
  - `deliveryPricing()` - One-to-many
  - `socialLinks()` - One-to-many
  - `followers()` - One-to-many (StoreFollow)

**Store Features**:
- Profile & banner images
- Theme customization
- Phone visibility settings
- Multiple addresses
- Delivery pricing rules
- Social media links
- Store reviews & ratings
- Follower system

**Store Users** (Multi-user support):
- `StoreUser` model allows multiple users per store
- Roles: owner, manager, staff
- Permissions system
- Access control via `hasStoreAccess()`, `getStoreRole()`, `hasStorePermission()`

### 3. Product Management

**Product Model** (`app/Models/Product.php`):
- Belongs to Store and Category
- Has many Variants, Images, Reviews
- Features:
  - Variants (size, color, etc.)
  - Multiple images
  - Video support
  - Bulk pricing
  - Delivery options
  - Referral fees
  - Loyalty points
  - Status: active, sold, unavailable
  - Google Vision indexing for image search

**Product Variants**:
- Size, color, material, etc.
- Individual stock management
- Price variations

**Product Images**:
- Multiple images per product
- Google Vision integration for visual search

**Product Stats**:
- View counts
- Click tracking
- Analytics data

### 4. Service Management

**Service Model** (`app/Models/Service.php`):
- Similar to products but for services
- Belongs to ServiceCategory
- Has media (images/videos)
- Sub-services support
- Service stats tracking

### 5. Order Management

**Order Model** (`app/Models/Order.php`):
- Belongs to User (buyer)
- Has many StoreOrders
- Contains:
  - Order number
  - Payment method & status
  - Totals (items, shipping, platform fee, discount, grand total)
  - Meta data (JSON)

**StoreOrder Model**:
- Links Order to Store
- Contains store-specific details:
  - Status (pending, accepted, rejected, placed, processing, out_for_delivery, delivered, cancelled)
  - Delivery details
  - Shipping fee
  - Subtotal

**OrderItem Model**:
- Links StoreOrder to Product
- Contains:
  - Product details (snapshot)
  - Quantity
  - Price (at time of order)
  - Line total

**Order Tracking**:
- Status history
- Timestamps
- Notes

### 6. Payment & Wallet System

**Wallet Model** (`app/Models/Wallet.php`):
- Multiple balance types:
  - `shopping_balance` - For purchases
  - `reward_balance` - Rewards/credits
  - `referral_balance` - Referral earnings
  - `loyality_points` - Loyalty points
  - `ad_credit` - Advertising credits

**Transaction Model**:
- Records all financial transactions
- Types: order_payment, wallet_topup, withdrawal, referral, etc.
- Status: success, pending, failed
- Links to orders, users

**Withdrawal System**:
- Automatic withdrawal via Flutterwave
- Bank account validation
- Withdrawal requests tracking

### 7. Chat System

**Chat Model**:
- Between buyer and seller
- Can be product-specific or service-specific
- Type: product, service, general

**ChatMessage Model**:
- Text messages
- Read/unread status
- Timestamps

**Features**:
- Real-time messaging
- Unread count tracking
- Message history

### 8. Review & Rating System

**ProductReview Model**:
- Linked to OrderItem (only buyers who purchased can review)
- Rating (1-5)
- Comment
- Seller can reply

**StoreReview Model**:
- Direct store reviews
- Rating (1-5)
- Comment
- Seller can reply

### 9. Loyalty Points System

**LoyaltyPoint Model**:
- Points earned per transaction
- Points redeemed
- Expiration tracking

**LoyaltySetting Model**:
- Store-level settings
- Points per amount spent
- Redemption rules

### 10. Referral System

**Referral Model**:
- Tracks referral relationships
- User codes and referral codes

**ReferralEarning Model**:
- Earnings from referrals
- Store referral earnings

**ReferralWithdrawal Model**:
- Withdrawal requests for referral earnings

### 11. Dispute Resolution

**Dispute Model**:
- Created by buyer for order issues
- Status: open, in_progress, resolved, closed
- Links to order

**DisputeChat Model**:
- Communication channel for disputes
- Messages between buyer, seller, admin

### 12. Subscription System

**SubscriptionPlan Model**:
- Plans for sellers
- Features, pricing
- Apple IAP product IDs

**Subscription Model**:
- Active subscriptions
- Apple receipt validation
- Status tracking

### 13. Boost Products

**BoostProduct Model**:
- Paid promotion for products
- Status: active, paused, completed
- Budget tracking
- Metrics (views, clicks)

### 14. Coupons & Discounts

**Coupon Model**:
- Store-level or platform-level
- Discount types: percentage, fixed
- Usage limits
- Expiry dates

### 15. Posts & Social Features

**Post Model**:
- Social media-like posts
- Images, videos
- Likes, comments, shares
- Reports system

### 16. Visual Search (Google Vision)

**ProductEmbedding Model**:
- Stores product embeddings for visual search
- Indexed status tracking

**Features**:
- Image-based product search
- Automatic indexing on product creation
- Background job processing

### 17. Notifications

**UserNotification Model**:
- In-app notifications
- Read/unread status
- Types: order, message, review, etc.

**SystemPushNotification Model**:
- Push notifications via Expo
- Broadcast or targeted

### 18. Support System

**SupportTicket Model**:
- Customer support tickets
- Status tracking
- Messages

### 19. Visitor Tracking

**StoreVisitor Model**:
- Tracks visitors to store profiles
- Activity logging
- Chat initiation from visitor list

### 20. Phone Number Requests

**RevealPhone Model**:
- Buyers request seller phone numbers
- Seller approval required
- Privacy control

---

## Database Structure

### Core Tables

**Users**:
- Basic user information
- Role, OTP, verification status
- Store relationship

**Stores**:
- Store information
- Onboarding progress
- Status, visibility

**Store Business Details**:
- Registration information
- Documents (NIN, CAC, utility bill)

**Store Addresses**:
- Multiple addresses per store
- Opening hours

**Store Delivery Pricing**:
- State/LGA-based pricing
- Variants (standard, express, etc.)

**Products**:
- Product information
- Pricing, stock
- Status flags

**Product Variants**:
- Size, color, etc.
- Individual stock

**Product Images**:
- Multiple images
- Vision indexing

**Orders**:
- Main order record
- Payment information

**Store Orders**:
- Store-specific order details
- Delivery information

**Order Items**:
- Product snapshots
- Quantities, prices

**Escrows**:
- Payment holding
- Release tracking

**Wallets**:
- Multiple balance types
- User financial data

**Transactions**:
- All financial movements
- Audit trail

### Relationship Summary

```
User (1) ──< (1) Store
Store (1) ──< (*) Product
Store (1) ──< (*) Service
Store (1) ──< (*) StoreOrder
Store (*) >──< (*) Category (many-to-many)

Order (1) ──< (*) StoreOrder
StoreOrder (1) ──< (*) OrderItem
OrderItem (*) >──< (1) Product

User (1) ──< (1) Wallet
User (1) ──< (*) Order
User (1) ──< (*) Transaction

StoreOrder (1) ──< (1) Escrow
```

---

## API Endpoints Overview

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/seller/start` - Seller onboarding start
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/forget-password` - Password reset

### Seller Routes (`/api/seller/*`)

**Registration**:
- `POST /api/seller/register/step1` - Step 1
- `POST /api/seller/register/{storeId}/step2` - Step 2
- `POST /api/seller/register/{storeId}/step3` - Step 3

**Onboarding** (Authenticated):
- `POST /api/seller/onboarding/level1/profile-media`
- `POST /api/seller/onboarding/level1/categories-social`
- `POST /api/seller/onboarding/level2/business-details`
- `POST /api/seller/onboarding/level2/documents`
- `POST /api/seller/onboarding/level3/physical-store`
- `POST /api/seller/onboarding/level3/utility-bill`
- `POST /api/seller/onboarding/level3/address` (CRUD)
- `POST /api/seller/onboarding/level3/delivery` (CRUD)
- `POST /api/seller/onboarding/level3/theme`
- `GET /api/seller/onboarding/progress`
- `POST /api/seller/onboarding/submit`

**Products**:
- `GET /api/seller/products` - List products
- `POST /api/seller/products/create` - Create product
- `POST /api/seller/products/update/{id}` - Update product
- `DELETE /api/seller/products/delete/{id}` - Delete product
- `POST /api/seller/products/{id}/video` - Upload video
- `POST /api/seller/products/{id}/mark-sold` - Mark as sold
- `POST /api/seller/products/{id}/mark-available` - Mark available

**Orders**:
- `GET /api/seller/orders` - List orders
- `GET /api/seller/orders/{id}` - Order details
- `GET /api/seller/store-orders/pending` - Pending orders
- `POST /api/seller/store-orders/{id}/accept` - Accept order
- `POST /api/seller/store-orders/{id}/reject` - Reject order
- `POST /api/seller/orders/{id}/out-for-deliver` - Mark out for delivery
- `POST /api/seller/orders/{id}/delivered` - Mark delivered

**Analytics**:
- `GET /api/seller/analytics` - Store analytics
- `GET /api/seller/products/{id}/stats` - Product stats
- `GET /api/seller/services/{id}/stats` - Service stats

**Chat**:
- `GET /api/seller/chat` - List chats
- `GET /api/seller/chat/{chatId}/messages` - Messages
- `POST /api/seller/chat/{chatId}/send` - Send message

**Store Management**:
- `GET /api/seller/store/builder` - Store overview
- `POST /api/seller/store/builder` - Update store
- `GET /api/seller/settings/phone-visibility` - Phone visibility
- `POST /api/seller/settings/phone-visibility` - Update visibility

**Other**:
- `GET /api/seller/escrow` - Escrow balance
- `GET /api/seller/disputes` - Disputes list
- `GET /api/seller/reviews` - Reviews list
- `GET /api/seller/visitors` - Store visitors
- `GET /api/seller/loyalty/customers` - Loyalty customers
- `GET /api/seller/subscriptions` - Subscriptions

### Buyer Routes (`/api/buyer/*`)

**Products**:
- `GET /api/buyer/product/get-all` - All products
- `GET /api/buyer/product-details/{id}` - Product details
- `GET /api/buyer/categories/{category}/products` - Category products

**Cart**:
- `GET /api/buyer/cart` - View cart
- `POST /api/buyer/cart/items` - Add item
- `POST /api/buyer/cart/items/{id}` - Update quantity
- `DELETE /api/buyer/cart/items/{id}` - Remove item
- `POST /api/buyer/cart/apply-coupon` - Apply coupon
- `POST /api/buyer/cart/apply-points` - Apply points

**Checkout**:
- `POST /api/buyer/checkout/preview` - Preview order
- `POST /api/buyer/checkout/place` - Place order

**Orders**:
- `GET /api/buyer/orders` - List orders
- `GET /api/buyer/orders/{id}` - Order details
- `GET /api/buyer/orders/{orderId}/payment-info` - Payment info
- `POST /api/buyer/orders/{orderId}/pay` - Pay with wallet
- `POST /api/buyer/payment/confirmation` - Confirm card payment
- `POST /api/buyer/orders/{orderId}/cancel` - Cancel order
- `POST /api/buyer/orders/{storeOrderId}/confirm-delivered` - Confirm delivery

**Reviews**:
- `POST /api/buyer/order-items/{orderItem}/review` - Product review
- `POST /api/buyer/stores/{storeId}/reviews` - Store review

**Chat**:
- `GET /api/buyer/chats` - List chats
- `GET /api/buyer/chats/{id}/messages` - Messages
- `POST /api/buyer/chats/{id}/send` - Send message
- `POST /api/buyer/chats/start/{store_id}` - Start chat

**Other**:
- `GET /api/buyer/stores` - List stores
- `GET /api/buyer/stores/{id}` - Store details
- `GET /api/buyer/saved-items` - Saved items
- `GET /api/buyer/followed-stores` - Followed stores
- `GET /api/buyer/escrow` - Escrow balance
- `GET /api/buyer/my-points` - Loyalty points
- `POST /api/buyer/phone-request` - Request phone number

### Public Routes

- `GET /api/categories` - All categories
- `GET /api/brands` - All brands
- `GET /api/buyer/product/get-all` - Products (public)
- `GET /api/buyer/stores` - Stores (public)
- `GET /api/search` - Search products
- `POST /api/search/by-image` - Image search
- `GET /api/posts` - Public posts
- `GET /api/faqs` - FAQs
- `GET /api/banners/active` - Active banners

---

## Key Features

### 1. Multi-Store Order System
- Separate orders per store
- Independent payment per order
- Store-specific delivery fees

### 2. Escrow Payment Protection
- Funds held until delivery
- Automatic release on delivery confirmation
- Secure transaction flow

### 3. Seller Onboarding
- Multi-step verification
- Document upload
- Admin approval process
- Progress tracking

### 4. Visual Product Search
- Google Cloud Vision integration
- Image-based product discovery
- Automatic indexing

### 5. Loyalty Points
- Earn points on purchases
- Redeem for discounts
- Store-level configuration

### 6. Referral System
- User referral codes
- Store referral fees
- Earnings tracking

### 7. Real-time Chat
- Buyer-seller communication
- Product/service-specific chats
- Unread notifications

### 8. Subscription Plans
- Seller subscriptions
- Apple IAP support
- Feature unlocks

### 9. Product Boosting
- Paid promotion
- Budget management
- Performance metrics

### 10. Dispute Resolution
- Order dispute system
- Chat-based resolution
- Admin intervention

### 11. Multi-User Store Support
- Multiple users per store
- Role-based permissions
- Access control

### 12. Phone Privacy
- Request-based phone reveal
- Seller approval required
- Privacy controls

### 13. Visitor Tracking
- Store visitor analytics
- Activity logging
- Engagement metrics

### 14. Wallet System
- Multiple balance types
- Top-up functionality
- Withdrawal support

### 15. Review System
- Product reviews (purchase-verified)
- Store reviews
- Seller reply functionality

---

## Additional Notes

### File Storage
- Images stored in `storage/app/public/stores/{store_id}/`
- Public access via `Storage::url()`

### Queue System
- Uses database queues
- Background job processing for:
  - Google Vision indexing
  - Email sending
  - Notifications

### Soft Deletes
- Most models use soft deletes
- Data retention for audit purposes

### Global Scopes
- Visibility scopes on User, Store, Product
- Filters inactive/hidden records

### Validation
- Form Request classes for validation
- Separate request classes per endpoint

### Services Layer
- Business logic in Services
- Controllers delegate to Services
- Reusable service methods

---

## Conclusion

This documentation provides a comprehensive overview of the Colala marketplace system. The architecture is modular, scalable, and follows Laravel best practices. The system supports a full e-commerce marketplace with advanced features like escrow payments, multi-step seller onboarding, visual search, and comprehensive order management.

For implementation of a similar system, focus on:
1. Seller onboarding flow (multi-step with progress tracking)
2. Order management (separate orders per store)
3. Escrow payment system
4. Real-time chat
5. Review and rating system
6. Wallet and transaction management

Each module is well-separated and can be implemented independently while maintaining integration points through the database relationships and API contracts.
