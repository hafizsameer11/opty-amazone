'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { promotionService, type Promotion } from '@/services/promotion-service';
import { productService, type Product } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function PromotionsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingPromotions, setLoadingPromotions] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    product_id: '',
    budget: '',
    discount_type: 'budget' as 'budget' | 'percentage' | 'fixed',
    discount_value: '',
    applies_to_price: false,
    duration_days: '',
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPromotions();
      loadProducts();
    }
  }, [isAuthenticated]);

  const loadPromotions = async () => {
    try {
      setLoadingPromotions(true);
      const response = await promotionService.getAll();
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setPromotions(response);
      } else if (response?.data) {
        setPromotions(response.data);
      } else {
        setPromotions([]);
      }
    } catch (error) {
      console.error('Failed to load promotions:', error);
      setError('Failed to load promotions');
    } finally {
      setLoadingPromotions(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await productService.getAll({ per_page: 100 });
      setProducts(response?.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const data: any = {
        product_id: Number(formData.product_id),
        discount_type: formData.discount_type,
        duration_days: parseInt(formData.duration_days),
      };

      if (formData.discount_type === 'budget') {
        data.budget = parseFloat(formData.budget) || 0;
      } else {
        data.discount_value = parseFloat(formData.discount_value) || 0;
        data.applies_to_price = formData.applies_to_price;
      }

      if (editingPromotion) {
        await promotionService.update(editingPromotion.id, data);
        setSuccess('Discount campaign updated successfully');
      } else {
        await promotionService.create(data);
        setSuccess('Discount campaign created successfully');
      }

      resetForm();
      loadPromotions();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save discount campaign');
    }
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      product_id: promotion.product_id.toString(),
      budget: promotion.budget?.toString() || '',
      discount_type: promotion.discount_type || 'budget',
      discount_value: promotion.discount_value?.toString() || '',
      applies_to_price: promotion.applies_to_price || false,
      duration_days: promotion.duration_days.toString(),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this discount campaign?')) {
      return;
    }

    try {
      await promotionService.delete(id);
      setSuccess('Discount campaign deleted successfully');
      loadPromotions();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete discount campaign');
    }
  };

  const handlePause = async (id: number) => {
    try {
      await promotionService.pause(id);
      loadPromotions();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to pause discount campaign');
    }
  };

  const handleResume = async (id: number) => {
    try {
      await promotionService.resume(id);
      loadPromotions();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to resume discount campaign');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      budget: '',
      discount_type: 'budget',
      discount_value: '',
      applies_to_price: false,
      duration_days: '',
    });
    setEditingPromotion(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading || loadingPromotions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Discount Campaigns</h1>
                    <p className="text-gray-600 mt-1">Manage product discounts and sales campaigns</p>
                  </div>
                  <Button onClick={() => setShowForm(true)}>
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Campaign
                  </Button>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {success && (
                  <div className="mb-4">
                    <Alert type="success" message={success} onClose={() => setSuccess('')} />
                  </div>
                )}

                {showForm && (
                  <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                      {editingPromotion ? 'Edit Campaign' : 'Create Campaign'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product *
                        </label>
                        <select
                          value={formData.product_id}
                          onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          required
                          disabled={loadingProducts}
                        >
                          <option value="">Select a product</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - €{Number(product.price || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Campaign Type *
                        </label>
                        <select
                          value={formData.discount_type}
                          onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'budget' | 'percentage' | 'fixed' })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          required
                        >
                          <option value="budget">Campaign Budget</option>
                          <option value="percentage">Percentage Discount</option>
                          <option value="fixed">Fixed Amount Discount</option>
                        </select>
                      </div>

                      {formData.discount_type === 'budget' ? (
                        <Input
                          label="Budget (€) *"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.budget}
                          onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                          required
                        />
                      ) : (
                        <>
                          <Input
                            label={formData.discount_type === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (€) *'}
                            type="number"
                            step="0.01"
                            min="0"
                            max={formData.discount_type === 'percentage' ? '100' : undefined}
                            value={formData.discount_value}
                            onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                            required
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="applies_to_price"
                              checked={formData.applies_to_price}
                              onChange={(e) => setFormData({ ...formData, applies_to_price: e.target.checked })}
                              className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                            />
                            <label htmlFor="applies_to_price" className="text-sm text-gray-700">
                              Apply discount to product price automatically
                            </label>
                          </div>
                        </>
                      )}

                      <Input
                        label="Duration (Days) *"
                        type="number"
                        min="1"
                        value={formData.duration_days}
                        onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                        required
                      />

                      <div className="flex gap-4">
                        <Button type="submit" className="flex-1">
                          {editingPromotion ? 'Update Campaign' : 'Create Campaign'}
                        </Button>
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {promotions.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No discount campaigns</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new discount campaign.</p>
                    <div className="mt-6">
                      <Button onClick={() => setShowForm(true)}>Create Campaign</Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spent</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {promotions.map((promotion) => (
                          <tr key={promotion.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{promotion.product.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {promotion.discount_type === 'budget' ? (
                                <>€{promotion.budget.toFixed(2)}</>
                              ) : promotion.discount_type === 'percentage' ? (
                                <>{promotion.discount_value}% OFF</>
                              ) : (
                                <>€{promotion.discount_value?.toFixed(2)} OFF</>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              €{promotion.spent.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {promotion.duration_days} days
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(promotion.status)}`}>
                                {promotion.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="text-xs">
                                <div>Views: {promotion.views}</div>
                                <div>Clicks: {promotion.clicks}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                {promotion.status === 'active' && (
                                  <button
                                    onClick={() => handlePause(promotion.id)}
                                    className="text-yellow-600 hover:text-yellow-900"
                                  >
                                    Pause
                                  </button>
                                )}
                                {promotion.status === 'paused' && (
                                  <button
                                    onClick={() => handleResume(promotion.id)}
                                    className="text-green-600 hover:text-green-900"
                                  >
                                    Resume
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEdit(promotion)}
                                  className="text-[#0066CC] hover:text-[#0052a3]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(promotion.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

