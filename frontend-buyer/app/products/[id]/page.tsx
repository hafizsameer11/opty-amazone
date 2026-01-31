"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import Button from "@/components/ui/Button";
import LensTypeModal from "@/components/products/LensTypeModal";
import { productService, type Product } from "@/services/product-service";
import { cartService } from "@/services/cart-service";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/Toast";
import Loader from "@/components/ui/Loader";

export default function ProductDetailPage() {
  const params = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showLensModal, setShowLensModal] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [couponCode, setCouponCode] = useState("");

  useEffect(() => {
    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getDetails(Number(params.id));
      setProduct(data);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
        <Header />
        <Loader fullScreen text="Loading product..." />
        <Footer />
        <BottomNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  const images = product.images || [];
  const firstImage = images[0] || '/file.svg';

  const handleAddToCart = async () => {
    // Check if user is authenticated before adding to cart
    if (!authLoading && !isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
      return;
    }

    setAddingToCart(true);
    try {
      await cartService.addItem({
        product_id: product.id,
        quantity: quantity,
      });
      await refreshCart(); // Refresh cart count
      showToast('success', 'Product added to cart successfully!');
    } catch (error: any) {
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
      } else {
        showToast('error', error.response?.data?.message || 'Failed to add to cart');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
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
            <span className="text-gray-900">{product.name}</span>
          </nav>


          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 mb-8">
            {/* Image Gallery - Left Side */}
            <div className="w-full lg:w-1/2 lg:sticky lg:top-4 lg:self-start space-y-4">
              <div className="relative aspect-square bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <Image
                  src={images[selectedImageIndex] || firstImage}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  priority
                />
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                        selectedImageIndex === index
                          ? "border-[#0066CC] ring-2 ring-[#0066CC]/30 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Right Side */}
            <div className="w-full lg:w-1/2 space-y-6">
              {/* Brand & Title */}
              <div>
                {product.store && (
                  <p className="text-sm font-semibold text-[#0066CC] mb-1">
                    {product.store.name}
                  </p>
                )}
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
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
                  <span className="text-sm text-gray-600">
                    ({product.review_count} reviews)
                  </span>
                  <span className="text-sm text-gray-500">
                    • {product.view_count} views
                  </span>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#0066CC]">
                  €{Number(product.price || 0).toFixed(2)}
                </span>
                {product.compare_at_price && Number(product.compare_at_price) > Number(product.price || 0) && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      €{Number(product.compare_at_price || 0).toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {Math.round(
                        ((Number(product.compare_at_price || 0) - Number(product.price || 0)) /
                          Number(product.compare_at_price || 1)) *
                          100
                      )}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.stock_status === "in_stock" ? (
                  <>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      ✓ In Stock
                    </span>
                    <span className="text-sm text-gray-600">
                      {product.stock_quantity} available
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-gray-700">{product.short_description}</p>
              )}



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
                        Math.min(product.stock_quantity, quantity + 1)
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
                    €{(Number(product.price || 0) * quantity).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock_status !== "in_stock" || addingToCart}
                  className="w-full"
                  size="lg"
                >
                  {addingToCart ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Adding to Cart...
                    </span>
                  ) : (
                    'Add to Cart'
                  )}
                </Button>
                <Button
                  onClick={async () => {
                    // Check if user is authenticated before proceeding to checkout
                    if (!authLoading && !isAuthenticated) {
                      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                      return;
                    }
                    setAddingToCart(true);
                    // Add to cart first, then redirect to checkout
                    try {
                      await cartService.addItem({
                        product_id: product.id,
                        quantity: quantity,
                      });
                      await refreshCart();
                      showToast('success', 'Product added! Redirecting to checkout...');
                      setTimeout(() => router.push('/checkout'), 500);
                    } catch (error: any) {
                      // If unauthorized, redirect to login
                      if (error.response?.status === 401) {
                        router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                      } else {
                        showToast('error', error.response?.data?.message || 'Failed to add to cart');
                      }
                      setAddingToCart(false);
                    }
                  }}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={product.stock_status !== "in_stock" || addingToCart}
                >
                  {addingToCart ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    'Buy Now'
                  )}
                </Button>
              </div>

              {/* Seller Info */}
              {product.store && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Sold by</p>
                      <Link
                        href={`/stores/${product.store.id}`}
                        className="font-semibold text-[#0066CC] hover:underline"
                      >
                        {product.store.name}
                      </Link>
                    </div>
                    <Link
                      href={`/stores/${product.store.id}`}
                      className="text-sm text-[#0066CC] hover:underline font-medium"
                    >
                      View Store →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Description & Specifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              {product.description && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Product Description
                  </h2>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                    {product.description}
                  </div>
                </div>
              )}

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
                      {product.product_type}
                    </dd>
                  </div>
                  {product.frame_shape && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500 uppercase">
                        Frame Shape
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">
                        {product.frame_shape}
                      </dd>
                    </div>
                  )}
                  {product.frame_material && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500 uppercase">
                        Frame Material
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">
                        {product.frame_material}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Gender
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {product.gender}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      SKU
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {product.sku}
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
                    {Number(product.rating || 0).toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
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
                  <p className="text-sm text-gray-600">
                    Based on {product.review_count} reviews
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  Write a Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
