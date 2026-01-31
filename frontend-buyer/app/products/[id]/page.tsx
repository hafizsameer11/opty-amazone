"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import LensTypeModal from "@/components/products/LensTypeModal";

// Mock product data - comprehensive structure for all product types
const mockProduct = {
  id: 1,
  name: "Classic Round Frame Glasses",
  slug: "classic-round-frame-glasses",
  sku: "FRAME-RND-001",
  brand: "VisionPro",
  product_type: "frame" as const,
  category: "Frames",
  sub_category: "Round Frames",
  
  // Pricing
  price: 89.99,
  compare_at_price: 129.99,
  stock_quantity: 45,
  stock_status: "in_stock" as const,
  
  // Media
  images: [
    "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1574258495973-f340df3d44cf?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512106378517-16c2f2d81b56?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80",
  ],
  
  // Frame-specific fields
  frame_shape: "round",
  frame_material: "acetate",
  frame_color: "Black",
  frame_colors: ["#111827", "#1f2937", "#4b5563", "#6b7280"],
  gender: "unisex" as const,
  
  // Frame sizes
  frame_sizes: [
    {
      id: 1,
      size_label: "Small",
      lens_width: 50,
      bridge_width: 18,
      temple_length: 140,
      frame_width: 135,
      frame_height: 40,
      stock_quantity: 15,
    },
    {
      id: 2,
      size_label: "Medium",
      lens_width: 52,
      bridge_width: 19,
      temple_length: 145,
      frame_width: 140,
      frame_height: 42,
      stock_quantity: 20,
    },
    {
      id: 3,
      size_label: "Large",
      lens_width: 54,
      bridge_width: 20,
      temple_length: 150,
      frame_width: 145,
      frame_height: 44,
      stock_quantity: 10,
    },
  ],
  
  // Lens options
  lens_types: [
    { 
      id: 1, 
      name: "Distance Vision", 
      description: "For distance (Thin, anti-glare, blue-cut options)",
      price: 0,
      options: ["Thin", "Anti-glare", "Blue-cut"]
    },
    { 
      id: 2, 
      name: "Near Vision", 
      description: "For near/reading (Thin, anti-glare, blue-cut options)",
      price: 0,
      options: ["Thin", "Anti-glare", "Blue-cut"]
    },
    { 
      id: 3, 
      name: "Progressive", 
      description: "Progressives (For two powers in same lenses)",
      price: 120,
      options: ["Thin", "Anti-glare", "Blue-cut"]
    },
  ],
  
  lens_index_options: [
    { id: 1, index: "1.50", description: "Standard", price: 0 },
    { id: 2, index: "1.56", description: "Thin", price: 30 },
    { id: 3, index: "1.61", description: "Thinner", price: 60 },
    { id: 4, index: "1.67", description: "Ultra Thin", price: 100 },
  ],
  
  treatment_options: [
    { id: 1, name: "Anti-Glare", price: 40 },
    { id: 2, name: "Blue Light Filter", price: 50 },
    { id: 3, name: "UV Protection", price: 30 },
    { id: 4, name: "Photochromic", price: 80 },
  ],
  
  // Description
  short_description: "Timeless round frames with modern comfort and style.",
  description: `These classic round frame glasses combine timeless elegance with modern comfort. Crafted from premium acetate material, these frames offer durability and a lightweight feel. Perfect for both men and women, these unisex frames feature a round shape that complements various face shapes.

Key Features:
• Premium acetate construction for durability
• Lightweight and comfortable for all-day wear
• Available in multiple colors and sizes
• Compatible with various lens types and treatments
• Modern design with classic appeal

Whether you need single vision, progressive, or bifocal lenses, these frames can accommodate your prescription needs. Add lens treatments like anti-glare, blue light filtering, or UV protection to enhance your vision experience.`,
  
  // Ratings & Reviews
  rating: 4.5,
  review_count: 234,
  view_count: 1250,
  
  // Seller info
  seller: {
    id: 1,
    name: "VisionPro Optics",
    rating: 4.8,
    total_products: 156,
  },
  
  // Shipping
  free_shipping: true,
  estimated_delivery: "3-5 business days",
  
  // Related products
  related_products: [
    {
      id: 2,
      name: "Aviator Sunglasses",
      price: 129.99,
      image: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=400&q=80",
      rating: 4.8,
    },
    {
      id: 3,
      name: "Designer Cat-Eye Frames",
      price: 159.99,
      image: "https://images.unsplash.com/photo-1574258495973-f340df3d44cf?auto=format&fit=crop&w=400&q=80",
      rating: 4.6,
    },
  ],
};

type ProductType = "frame" | "sunglasses" | "contact_lens" | "eye_hygiene" | "accessory";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(mockProduct.frame_colors[0]);
  const [selectedSize, setSelectedSize] = useState(mockProduct.frame_sizes[0]);
  const [selectedLensType, setSelectedLensType] = useState(mockProduct.lens_types[0]);
  const [selectedLensIndex, setSelectedLensIndex] = useState(mockProduct.lens_index_options[0]);
  const [selectedTreatments, setSelectedTreatments] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showLensModal, setShowLensModal] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [couponCode, setCouponCode] = useState("");

  const handleTreatmentToggle = (treatmentId: number) => {
    setSelectedTreatments((prev) =>
      prev.includes(treatmentId)
        ? prev.filter((id) => id !== treatmentId)
        : [...prev, treatmentId]
    );
  };

  const shippingOptions = [
    { id: "standard", name: "Standard Shipping", days: "4 business days", price: 3.90 },
    { id: "express", name: "Express Shipping", days: "2 business days", price: 8.90 },
    { id: "overnight", name: "Overnight", days: "1 business day", price: 15.90 },
  ];

  const calculateSubtotal = () => {
    let total = mockProduct.price;
    total += selectedLensType.price;
    total += selectedLensIndex.price;
    selectedTreatments.forEach((treatmentId) => {
      const treatment = mockProduct.treatment_options.find((t) => t.id === treatmentId);
      if (treatment) total += treatment.price;
    });
    return total * quantity;
  };

  const calculateShipping = () => {
    const shipping = shippingOptions.find((s) => s.id === selectedShipping);
    return shipping?.price || 0;
  };

  const calculateTotalPrice = () => {
    return calculateSubtotal() + calculateShipping();
  };

  const handleAddToCart = () => {
    // TODO: Integrate with cart API
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 3000);
  };

  const handleLensModalContinue = () => {
    setShowLensModal(false);
    // Additional logic after lens selection
  };

  const handleApplyCoupon = () => {
    // TODO: Apply coupon logic
    console.log("Applying coupon:", couponCode);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        <div className="w-full max-w-7xl mx-auto px-1 sm:px-2 lg:px-0 py-6 md:py-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#0066CC]">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-[#0066CC]">
              Products
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{mockProduct.name}</span>
          </nav>

          {showSuccessAlert && (
            <div className="mb-4">
              <Alert type="success" message="Product added to cart successfully!" />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <Image
                  src={mockProduct.images[selectedImageIndex]}
                  alt={mockProduct.name}
                  fill
                  className="object-contain p-4"
                  priority
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {mockProduct.images.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                      selectedImageIndex === index
                        ? "border-[#0066CC] ring-2 ring-[#0066CC]/30"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${mockProduct.name} view ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Brand & Title */}
              <div>
                <p className="text-sm font-semibold text-[#0066CC] mb-1">
                  {mockProduct.brand}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {mockProduct.name}
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(mockProduct.rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    ({mockProduct.review_count} reviews)
                  </span>
                  <span className="text-sm text-gray-500">
                    • {mockProduct.view_count} views
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#0066CC]">
                  ${mockProduct.price.toFixed(2)}
                </span>
                {mockProduct.compare_at_price && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      ${mockProduct.compare_at_price.toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {Math.round(
                        ((mockProduct.compare_at_price - mockProduct.price) /
                          mockProduct.compare_at_price) *
                          100
                      )}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {mockProduct.stock_status === "in_stock" ? (
                  <>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      ✓ In Stock
                    </span>
                    <span className="text-sm text-gray-600">
                      {mockProduct.stock_quantity} available
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Short Description */}
              <p className="text-gray-700">{mockProduct.short_description}</p>

              {/* Frame Color Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Frame Color
                </label>
                <div className="flex gap-2">
                  {mockProduct.frame_colors.map((color, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`h-10 w-10 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? "border-[#0066CC] ring-2 ring-[#0066CC]/30 scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Frame Size Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Frame Size
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {mockProduct.frame_sizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedSize.id === size.id
                          ? "border-[#0066CC] bg-[#0066CC]/5 text-[#0066CC]"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold">{size.size_label}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {size.lens_width}mm • {size.bridge_width}mm • {size.temple_length}mm
                      </div>
                      {size.stock_quantity < 5 && (
                        <div className="text-xs text-orange-600 mt-1">
                          Only {size.stock_quantity} left
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Select Lenses Button */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Lens Type
                </label>
                <Button
                  type="button"
                  onClick={() => setShowLensModal(true)}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  {selectedLensType ? selectedLensType.name : "Select Lenses"}
                </Button>
              </div>


              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
                  >
                    −
                  </button>
                  <span className="text-lg font-semibold w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity(
                        Math.min(mockProduct.stock_quantity, quantity + 1)
                      )
                    }
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Price */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                  <span className="text-lg font-bold text-[#0066CC]">
                    ${calculateTotalPrice().toFixed(2)}
                  </span>
                </div>
                {mockProduct.free_shipping && (
                  <p className="text-xs text-green-600">✓ Free shipping included</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={mockProduct.stock_status !== "in_stock"}
                  className="w-full"
                  size="lg"
                >
                  Add to Cart
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Buy Now
                </Button>
              </div>

              {/* Shipping Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Estimated Delivery</p>
                    <p>{mockProduct.estimated_delivery}</p>
                    {mockProduct.free_shipping && (
                      <p className="mt-1 text-green-700 font-medium">
                        ✓ Free shipping on this item
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Seller Info */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sold by</p>
                    <Link
                      href={`/stores/${mockProduct.seller.id}`}
                      className="font-semibold text-[#0066CC] hover:underline"
                    >
                      {mockProduct.seller.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex text-yellow-400 text-xs">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(mockProduct.seller.rating)
                                ? "fill-current"
                                : "text-gray-300"
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs text-gray-600">
                        {mockProduct.seller.rating} • {mockProduct.seller.total_products} products
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/stores/${mockProduct.seller.id}`}
                    className="text-sm text-[#0066CC] hover:underline font-medium"
                  >
                    View Store →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description & Specifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Product Description
                </h2>
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                  {mockProduct.description}
                </div>
              </div>

              {/* Specifications */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Specifications
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Product Type
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {mockProduct.product_type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Frame Shape
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {mockProduct.frame_shape}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Frame Material
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {mockProduct.frame_material}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Gender
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {mockProduct.gender}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      SKU
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {mockProduct.sku}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Brand
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {mockProduct.brand}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Customer Reviews
              </h2>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {mockProduct.rating}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(mockProduct.rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600">
                    Based on {mockProduct.review_count} reviews
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  Write a Review
                </Button>
              </div>
            </div>
          </div>

          {/* Related Products */}
          {mockProduct.related_products && mockProduct.related_products.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                You May Also Like
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockProduct.related_products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group"
                  >
                    <div className="relative aspect-square bg-gray-50">
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-contain p-4 group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm group-hover:text-[#0066CC] transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3 h-3 ${
                              i < Math.floor(product.rating)
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-lg font-bold text-[#0066CC]">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Lens Type Modal */}
      <LensTypeModal
        isOpen={showLensModal}
        onClose={() => setShowLensModal(false)}
        lensTypes={mockProduct.lens_types}
        selectedLensType={selectedLensType}
        onSelect={setSelectedLensType}
        onContinue={handleLensModalContinue}
        productImage={mockProduct.images[selectedImageIndex]}
        productName={mockProduct.name}
        productPrice={mockProduct.price}
        subtotal={calculateSubtotal()}
        shippingPrice={calculateShipping()}
        total={calculateTotalPrice()}
        shippingOptions={shippingOptions}
        selectedShipping={selectedShipping}
        onShippingChange={setSelectedShipping}
        couponCode={couponCode}
        onCouponChange={setCouponCode}
        onApplyCoupon={handleApplyCoupon}
        lensIndexOptions={mockProduct.lens_index_options}
        selectedLensIndex={selectedLensIndex}
        onLensIndexSelect={setSelectedLensIndex}
        treatmentOptions={mockProduct.treatment_options}
        selectedTreatments={selectedTreatments}
        onTreatmentToggle={handleTreatmentToggle}
      />

      <Footer />
    </div>
  );
}
