'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { productService, type Product, type Category, type CreateProductData } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import UnifiedProductForm from '@/components/products/UnifiedProductForm';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    category_id: undefined,
    sub_category_id: undefined,
    sku: '',
    description: '',
    short_description: '',
    product_type: 'frame',
    price: 0,
    compare_at_price: undefined,
    cost_price: undefined,
    stock_quantity: 0,
    stock_status: 'in_stock',
    images: [],
    frame_shape: '',
    frame_material: '',
    frame_color: '',
    gender: 'unisex',
    lens_type: '',
    lens_index_options: [],
    treatment_options: [],
    is_featured: false,
    is_active: true,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
      if (params.id && params.id !== 'new' && params.id !== 'new/edit') {
        loadProduct();
      } else {
        setLoadingProduct(false);
      }
    }
  }, [isAuthenticated, params.id]);

  const loadProduct = async () => {
    try {
      setLoadingProduct(true);
      const data = await productService.getOne(Number(params.id));
      setProduct(data);
      setFormData({
        name: data.name,
        category_id: data.category_id || undefined,
        sub_category_id: data.sub_category_id || undefined,
        sku: data.sku,
        description: data.description || '',
        short_description: data.short_description || '',
        product_type: data.product_type,
        price: data.price,
        compare_at_price: data.compare_at_price || undefined,
        sale_start_date: data.sale_start_date || undefined,
        sale_end_date: data.sale_end_date || undefined,
        cost_price: data.cost_price || undefined,
        stock_quantity: data.stock_quantity,
        stock_status: data.stock_status,
        images: data.images || [],
        frame_shape: data.frame_shape || '',
        frame_material: data.frame_material || '',
        frame_color: data.frame_color || '',
        gender: data.gender || 'unisex',
        lens_type: data.lens_type || '',
        lens_index_options: data.lens_index_options || [],
        treatment_options: data.treatment_options || [],
        is_featured: data.is_featured,
        is_active: data.is_active,
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load product');
    } finally {
      setLoadingProduct(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (params.id && params.id !== 'new' && params.id !== 'new/edit') {
        await productService.update(Number(params.id), formData);
        setSuccess('Product updated successfully');
      } else {
        await productService.create(formData);
        setSuccess('Product created successfully');
        setTimeout(() => {
          router.push('/products');
        }, 1500);
      }
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.errors?.name?.[0] ||
        error.response?.data?.errors?.sku?.[0] ||
        error.response?.data?.message ||
        'Failed to save product';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = (images: string[]) => {
    setFormData({
      ...formData,
      images,
    });
  };

  if (loading || loadingProduct) {
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

  const isNew = params.id === 'new' || params.id === 'new/edit';
  const selectedCategory = categories.find(c => c.id === formData.category_id);
  const subCategories = selectedCategory?.children || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                  <button
                    onClick={() => router.back()}
                    className="text-[#0066CC] hover:underline mb-4"
                  >
                    ← Back to Products
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isNew ? 'Create Product' : 'Edit Product'}
                  </h1>
                </div>

                <UnifiedProductForm productId={Number(params.id)} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

