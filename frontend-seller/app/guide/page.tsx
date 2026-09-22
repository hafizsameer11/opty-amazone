'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

type GuideSection = 'overview' | 'category-lens' | 'products' | 'orders' | 'store' | 'all-menus';

export default function GuidePage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('guide.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const sections = [
    { id: 'overview' as GuideSection, name: t('guide.overview'), icon: '📚' },
    { id: 'category-lens' as GuideSection, name: t('guide.categoryLens'), icon: '👓' },
    { id: 'products' as GuideSection, name: t('guide.products'), icon: '📦' },
    { id: 'orders' as GuideSection, name: t('guide.orders'), icon: '📋' },
    { id: 'store' as GuideSection, name: t('guide.store'), icon: '🏪' },
    { id: 'all-menus' as GuideSection, name: t('guide.allMenus'), icon: '📑' },
  ];

  return (
    <div className="seller-guide-page min-h-screen overflow-x-hidden bg-gray-50">
      <div className="flex min-w-0">
        <Sidebar />
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="py-3 sm:py-6">
              <div className="mx-auto min-w-0 max-w-7xl px-3 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="rounded-t-2xl bg-gradient-to-r from-[#0066CC] to-[#0052A3] p-4 text-white sm:rounded-t-lg sm:p-8">
                  <h1 className="mb-1 text-2xl font-bold sm:mb-2 sm:text-4xl">{t('guide.title')}</h1>
                  <p className="text-sm text-blue-100 sm:text-lg">{t('guide.subtitle')}</p>
                </div>

                <div className="rounded-b-2xl bg-white shadow-sm sm:rounded-b-lg sm:shadow-lg">
                  {/* Navigation Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="flex min-w-0 overflow-x-auto px-2 sm:px-6" aria-label={t('guide.tabs')}>
                      {sections.map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveSection(section.id)}
                          className={`
                            flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition-colors whitespace-nowrap sm:px-4 sm:py-4 sm:text-sm
                            ${
                              activeSection === section.id
                                ? 'border-[#0066CC] text-[#0066CC]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          <span className="text-lg">{section.icon}</span>
                          {section.name}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Content Area */}
                  <div className="seller-guide-content min-w-0 p-4 sm:p-8">
                    {/* Overview Section */}
                    {activeSection === 'overview' && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('guide.welcome')}</h2>
                          <p className="text-lg text-gray-700 mb-6">
                            {t('guide.welcomeDescription')}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('guide.gettingStarted')}</h3>
                            <ul className="space-y-2 text-gray-700">
                              <li>• {t('Complete your store profile setup')}</li>
                              <li>• {t('Configure lens options for your categories')}</li>
                              <li>• {t('Add your first products')}</li>
                              <li>• {t('Set up shipping and payment methods')}</li>
                            </ul>
                          </div>

                          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('guide.keyFeatures')}</h3>
                            <ul className="space-y-2 text-gray-700">
                              <li>• {t('Category-specific lens configuration')}</li>
                              <li>• {t('Product management with variants')}</li>
                              <li>• {t('Order management and tracking')}</li>
                              <li>• {t('Analytics and reporting')}</li>
                            </ul>
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-yellow-900 mb-3">{t('guide.quickTips')}</h3>
                          <ul className="space-y-2 text-yellow-800">
                            <li>• {t('Configure lens options before adding products for best results')}</li>
                            <li>• {t('Use high-quality product images to increase sales')}</li>
                            <li>• {t('Keep stock quantities updated to avoid overselling')}</li>
                            <li>• {t('Respond to orders quickly to maintain customer satisfaction')}</li>
                          </ul>
                        </div>

                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('guide.navigation')}</h3>
                          <p className="text-gray-700 mb-4">
                            {t('Use the tabs above to navigate to different sections of this guide:')}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {sections.filter(s => s.id !== 'overview').map((section) => (
                              <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-[#0066CC] hover:bg-blue-50 transition-all"
                              >
                                <div className="text-2xl mb-2">{section.icon}</div>
                                <div className="font-semibold text-gray-900">{section.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{t('guide.clickLearn')}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Category Lens Configuration Section */}
                    {activeSection === 'category-lens' && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('guide.lensHeading')}</h2>
                          <p className="text-lg text-gray-600">{t('guide.lensDescription')}</p>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
                           <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('guide.whatLens')}</h3>
                          <p className="text-gray-700 mb-4">
                             {t('guide.lensWhatDescription')}
                          </p>
                          <div className="bg-white rounded p-4 mt-4">
                            <p className="text-sm text-gray-600">
                              <strong>{t('guide.example')}</strong> {t('guide.exampleText')}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('guide.steps')}</h3>
                          <div className="space-y-4">
                            {[
                              {
                                step: 1,
                                title: 'Access Lens Configuration',
                                description: 'Click "Lens Configuration" in the sidebar menu or navigate to /category-lens-config',
                                details: 'You will see a list of all product categories in your store.'
                              },
                              {
                                step: 2,
                                title: 'Select a Category',
                                description: 'Find the category you want to configure (e.g., "Eyeglasses", "Sunglasses")',
                                details: 'Click the "Configure" button next to the category name. The category will expand to show configuration options.'
                              },
                              {
                                step: 3,
                                title: 'Choose Lens Types',
                                description: 'Select which lens types to offer for this category',
                                details: 'Check boxes for: Distance Vision, Near Vision, Progressive. Each shows its price adjustment.'
                              },
                              {
                                step: 4,
                                title: 'Select Treatments',
                                description: 'Choose lens treatments available for this category',
                                details: 'Options include: Anti-Reflective, Blue Light Filter, UV Protection, etc. Each shows its price.'
                              },
                              {
                                step: 5,
                                title: 'Choose Coatings',
                                description: 'Select lens coatings to offer',
                                details: 'Options include: Hard Coating, Anti-Scratch, Hydrophobic, etc.'
                              },
                              {
                                step: 6,
                                title: 'Configure Thickness',
                                description: 'Select thickness materials and options',
                                details: 'Choose materials (Standard, Thin, Ultra-Thin) and thickness values (1.50, 1.56, 1.59, 1.67, etc.)'
                              },
                              {
                                step: 7,
                                title: 'Save Configuration',
                                description: 'Click "Save Configuration" button at the bottom',
                                details: 'A success message will appear. The configuration is now active for all products in that category.'
                              },
                              {
                                step: 8,
                                title: 'Verify Configuration',
                                description: 'Test by viewing a product in that category as a buyer',
                                details: 'Open the product detail page, click "Add to Cart", and verify that only your configured options appear in the customization popup.'
                              }
                            ].map((item) => (
                              <div key={item.step} className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-4">
                                  <div className="flex-shrink-0 w-10 h-10 bg-[#0066CC] text-white rounded-full flex items-center justify-center font-bold text-lg">
                                    {item.step}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-1">{t(item.title)}</h4>
                                    <p className="text-gray-700 mb-2">{t(item.description)}</p>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{t(item.details)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-green-900 mb-3">{t('guide.whereOptions')}</h3>
                          <div className="space-y-3 text-green-800">
                            <div>
                              <p className="font-semibold mb-2">{t('guide.buyerInterface')}</p>
                              <ol className="list-decimal list-inside space-y-1 ml-4">
                                <li>{t('Buyer clicks on a product (e.g., eyeglasses)')}</li>
                                <li>{t('Buyer clicks "Add to Cart" or "Customize" button')}</li>
                                <li>{t('A customization popup modal opens')}</li>
                                <li>{t('The modal shows only the lens options you configured for that product\'s category')}</li>
                                <li>{t('Buyer selects options and adds to cart')}</li>
                              </ol>
                            </div>
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-yellow-900 mb-3">{t('⚠️ Important Notes')}</h3>
                          <ul className="space-y-2 text-yellow-800">
                            <li>• {t('Configure lens options before adding products for best results')}</li>
                            <li>• {t('Each category can have different configurations')}</li>
                            <li>• {t('If no configuration is set, all global lens options will be shown (fallback)')}</li>
                            <li>• {t('Changes take effect immediately after saving')}</li>
                            <li>• {t('Always test in buyer view to verify configuration')}</li>
                          </ul>
                        </div>

                        <div className="flex gap-4">
                          <Link
                            href="/category-lens-config"
                            className="px-6 py-3 bg-[#0066CC] text-white rounded-lg font-semibold hover:bg-[#0052A3] transition-colors"
                          >
                            {t('Go to Lens Configuration →')}
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Products Section */}
                    {activeSection === 'products' && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('guide.productManagement')}</h2>
                          <p className="text-lg text-gray-600">{t('guide.productManagementDescription')}</p>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('Product Types')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                            <div>
                              <p className="font-semibold mb-2">{t('Supported Types:')}</p>
                              <ul className="space-y-1">
                                <li>• {t('Frames (Eyeglasses)')}</li>
                                <li>• {t('Sunglasses')}</li>
                                <li>• {t('Contact Lenses')}</li>
                                <li>• {t('Eye Hygiene Products')}</li>
                                <li>• {t('Accessories')}</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-semibold mb-2">{t('Each type has specific fields:')}</p>
                              <ul className="space-y-1">
                                <li>• {t('Frames: Shape, material, color, gender')}</li>
                                <li>• {t('Contact Lenses: Base curve, diameter, power range')}</li>
                                <li>• {t('Eye Hygiene: Size, volume, pack type')}</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('guide.creatingProduct')}</h3>
                          <div className="space-y-4">
                            {[
                              { title: 'Basic Information', items: ['Product name', 'Description', 'Short description', 'SKU (unique identifier)', 'Category selection'] },
                              { title: 'Pricing & Stock', items: ['Base price', 'Compare at price (optional)', 'Cost price', 'Stock quantity', 'Stock status (in_stock, out_of_stock, backorder)'] },
                              { title: 'Images', items: ['Upload product images (up to 10)', 'Set featured image (first image)', 'Drag to reorder images', 'Images are automatically saved'] },
                              { title: 'Product-Specific Fields', items: ['Fill fields based on product type', 'Frame shape, material, color for eyeglasses', 'Base curve, diameter for contact lenses', 'Size, volume for eye hygiene products'] },
                              { title: 'Variants (Optional)', items: ['Create variants for sizes, colors, models', 'Set different prices per variant', 'Set default variant', 'Manage variant stock'] },
                              { title: 'Activate Product', items: ['Set product as active', 'Save product', 'Product appears in buyer storefront'] }
                            ].map((section, idx) => (
                              <div key={idx} className="border border-gray-200 rounded-lg p-5">
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">{t(section.title)}</h4>
                                <ul className="space-y-2">
                                  {section.items.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-gray-700">
                                      <span className="text-[#0066CC] mt-1">✓</span>
                                      <span>{t(item)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-green-900 mb-3">{t('guide.bestPractices')}</h3>
                          <ul className="space-y-2 text-green-800">
                            <li>• {t('Use clear, descriptive product names')}</li>
                            <li>• {t('Write detailed descriptions with key features')}</li>
                            <li>• {t('Upload multiple high-quality images from different angles')}</li>
                            <li>• {t('Keep stock quantities updated')}</li>
                            <li>• {t('Set appropriate prices and compare-at prices for sales')}</li>
                            <li>• {t('Use variants for products with multiple options (sizes, colors)')}</li>
                          </ul>
                        </div>

                        <div className="flex gap-4">
                          <Link
                            href="/products"
                            className="px-6 py-3 bg-[#0066CC] text-white rounded-lg font-semibold hover:bg-[#0052A3] transition-colors"
                          >
                            {t('Go to Products →')}
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Orders Section */}
                    {activeSection === 'orders' && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('guide.orderManagement')}</h2>
                          <p className="text-lg text-gray-600">{t('guide.orderManagementDescription')}</p>
                        </div>

                        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
                          <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('guide.orderStatuses')}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { status: 'Pending', desc: 'New order, awaiting processing', color: 'yellow' },
                              { status: 'Processing', desc: 'Order is being prepared', color: 'blue' },
                              { status: 'Shipped', desc: 'Order has been shipped', color: 'purple' },
                              { status: 'Delivered', desc: 'Order delivered to customer', color: 'green' },
                              { status: 'Cancelled', desc: 'Order cancelled', color: 'red' }
                            ].map((item) => (
                              <div key={item.status} className="bg-white rounded p-4 border-2 border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-3 h-3 rounded-full bg-${item.color}-500`}></div>
                                  <span className="font-semibold text-gray-900">{t(item.status)}</span>
                                </div>
                                <p className="text-sm text-gray-600">{t(item.desc)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('guide.orderWorkflow')}</h3>
                          <div className="space-y-4">
                            {[
                              { step: 'View Orders', desc: 'See all orders in the orders list, filter by status, search by order number' },
                              { step: 'Review Order', desc: 'Click on an order to view details: products, quantities, customer info, shipping address' },
                              { step: 'Process Order', desc: 'Update status to "Processing" when you start preparing the order' },
                              { step: 'Ship Order', desc: 'Update to "Shipped" when order is dispatched, add tracking number if available' },
                              { step: 'Complete Order', desc: 'Order automatically moves to "Delivered" or you can mark it manually' }
                            ].map((item, idx) => (
                              <div key={idx} className="border-l-4 border-[#0066CC] pl-4 py-2">
                                <h4 className="font-semibold text-gray-900">{t(item.step)}</h4>
                                <p className="text-gray-600">{t(item.desc)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-yellow-900 mb-3">{t('💡 Tips')}</h3>
                          <ul className="space-y-2 text-yellow-800">
                            <li>• {t('Process orders promptly to maintain customer satisfaction')}</li>
                            <li>• {t('Update order status regularly so customers can track their orders')}</li>
                            <li>• {t('Add tracking numbers when available')}</li>
                            <li>• {t('Contact customers if there are any issues with their orders')}</li>
                          </ul>
                        </div>

                        <div className="flex gap-4">
                          <Link
                            href="/orders"
                            className="px-6 py-3 bg-[#0066CC] text-white rounded-lg font-semibold hover:bg-[#0052A3] transition-colors"
                          >
                            {t('Go to Orders →')}
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Store Settings Section */}
                    {activeSection === 'store' && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('guide.storeSettings')}</h2>
                          <p className="text-lg text-gray-600">{t('guide.storeDescription')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('guide.storeProfile')}</h3>
                            <ul className="space-y-2 text-gray-700">
                              <li>• {t('Store name and description')}</li>
                              <li>• {t('Contact email and phone')}</li>
                              <li>• {t('Store logo/profile image')}</li>
                              <li>• {t('Banner image')}</li>
                              <li>• {t('Theme colors')}</li>
                            </ul>
                          </div>

                          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">{t('guide.storeSettingsCard')}</h3>
                            <ul className="space-y-2 text-gray-700">
                              <li>• {t('Social media links')}</li>
                              <li>• {t('Store policies')}</li>
                              <li>• {t('Shipping settings')}</li>
                              <li>• {t('Payment methods')}</li>
                              <li>• {t('Notification preferences')}</li>
                            </ul>
                          </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                          <h3 className="text-xl font-semibold text-yellow-900 mb-3">{t('guide.setupChecklist')}</h3>
                          <ul className="space-y-2 text-yellow-800">
                            <li>✓ {t('Complete store profile information')}</li>
                            <li>✓ {t('Upload store logo and banner')}</li>
                            <li>✓ {t('Set up contact information')}</li>
                            <li>✓ {t('Configure shipping options')}</li>
                            <li>✓ {t('Set up payment methods')}</li>
                            <li>✓ {t('Add social media links')}</li>
                            <li>✓ {t('Write store policies')}</li>
                          </ul>
                        </div>

                        <div className="flex gap-4">
                          <Link
                            href="/store"
                            className="px-6 py-3 bg-[#0066CC] text-white rounded-lg font-semibold hover:bg-[#0052A3] transition-colors"
                          >
                            {t('Go to Store Settings →')}
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* All Menu Items Section */}
                    {activeSection === 'all-menus' && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('guide.allMenuTitle')}</h2>
                          <p className="text-lg text-gray-600">{t('guide.allMenuDescription')}</p>
                        </div>

                        <div className="space-y-4">
                          {[
                            {
                              name: 'Dashboard',
                              href: '/',
                              icon: '🏠',
                              description: 'Overview of your store performance, sales statistics, recent orders, and quick actions',
                              features: ['Sales overview', 'Recent orders', 'Product statistics', 'Revenue charts', 'Quick actions']
                            },
                            {
                              name: 'Store',
                              href: '/store',
                              icon: '🏪',
                              description: 'Manage your store profile, logo, banner, theme colors, contact information, and store settings',
                              features: ['Store profile', 'Logo & banner', 'Theme colors', 'Contact info', 'Social links', 'Policies']
                            },
                            {
                              name: 'Products',
                              href: '/products',
                              icon: '📦',
                              description: 'Create, edit, delete, and manage all your products. Add images, set prices, manage stock, create variants',
                              features: ['Product CRUD', 'Image upload', 'Stock management', 'Variants', 'Category assignment', 'Product types']
                            },
                            {
                              name: 'Lens Configuration',
                              href: '/category-lens-config',
                              icon: '👓',
                              description: 'Configure lens options (types, treatments, coatings, thickness) for each product category',
                              features: ['Category-specific config', 'Lens types', 'Treatments', 'Coatings', 'Thickness options']
                            },
                            {
                              name: 'Field Configuration',
                              href: '/category-field-config',
                              icon: '⚙️',
                              description: 'Configure custom fields and validation rules for product categories',
                              features: ['Field visibility', 'Required fields', 'Validation rules', 'Field labels']
                            },
                            {
                              name: 'Orders',
                              href: '/orders',
                              icon: '📋',
                              description: 'View and manage customer orders. Update status, track shipments, view order details, print invoices',
                              features: ['Order list', 'Status updates', 'Order details', 'Tracking', 'Invoices', 'Customer info']
                            },
                            {
                              name: 'Discount Campaigns',
                              href: '/promotions',
                              icon: '🎉',
                              description: 'Create discount campaigns, set discount rules, schedule sales, and track campaign performance',
                              features: ['Create campaigns', 'Discount rules', 'Scheduling', 'Performance tracking']
                            },
                            {
                              name: 'Boost Ads',
                              href: '/boost-ads',
                              icon: '⚡',
                              description: 'Boost products with paid ads placement using Stripe checkout (frontend flow)',
                              features: ['Select product', 'Set budget', 'Stripe card payment', 'Ad placement request']
                            },
                            {
                              name: 'Announcements',
                              href: '/announcements',
                              icon: '📢',
                              description: 'Create store announcements to communicate with customers, set visibility, schedule display',
                              features: ['Create announcements', 'Visibility settings', 'Scheduling', 'Display management']
                            },
                            {
                              name: 'Banners',
                              href: '/banners',
                              icon: '🖼️',
                              description: 'Manage banner images for your store homepage and category pages, set placement and links',
                              features: ['Banner creation', 'Placement settings', 'Scheduling', 'Product/category links']
                            },
                            {
                              name: 'Analytics',
                              href: '/analytics',
                              icon: '📊',
                              description: 'View sales reports, product performance, customer analytics, revenue trends, and export reports',
                              features: ['Sales reports', 'Product performance', 'Customer analytics', 'Revenue trends', 'Export reports']
                            },
                            {
                              name: 'Messages',
                              href: '/messages',
                              icon: '💬',
                              description: 'Communicate with customers, reply to inquiries, manage conversations, view message notifications',
                              features: ['View messages', 'Reply to customers', 'Conversation management', 'Notifications']
                            }
                          ].map((item) => (
                            <div key={item.name} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                <div className="text-4xl">{item.icon}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-xl font-semibold text-gray-900">{t(item.name)}</h3>
                                    <Link 
                                      href={item.href}
                                      className="text-sm text-[#0066CC] hover:underline font-medium"
                                    >
                                      {t('guide.goTo', { name: t(item.name) })}
                                    </Link>
                                  </div>
                                  <p className="text-gray-700 mb-3">{t(item.description)}</p>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 mb-2">{t('guide.features')}</p>
                                    <div className="flex flex-wrap gap-2">
                                      {item.features.map((feature, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                          {t(feature)}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
