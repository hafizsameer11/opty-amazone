'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { categoryService, type Category, type CreateCategoryData } from '@/services/category-service';
import { useToast } from '@/components/ui/Toast';

export default function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CreateCategoryData>({
    name: '',
    slug: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAll();
      setCategories(data || []);
    } catch (error) {
      showToast('error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '', description: '', is_active: true });
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      is_active: category.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, formData);
        showToast('success', 'Category updated successfully');
      } else {
        await categoryService.create(formData);
        showToast('success', 'Category created successfully');
      }
      setShowModal(false);
      loadCategories();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await categoryService.delete(id);
      showToast('success', 'Category deleted successfully');
      loadCategories();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Categories</h1>
            <p className="text-white/70">Manage product categories</p>
          </div>
          <Button onClick={handleCreate}>Create Category</Button>
        </div>

        <GlassCard>
          {loading ? (
            <div className="text-center py-12 text-white/70">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-white/70">No categories found</div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="glass rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{category.name}</h3>
                    {category.description && (
                      <p className="text-sm text-white/70 mt-1">{category.description}</p>
                    )}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <p className="text-xs text-white/60 mt-1">
                        {category.subcategories.length} subcategories
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={category.is_active ? 'success' : 'default'}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(category)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(category.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingCategory ? 'Edit Category' : 'Create Category'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              required
            />
            <Input
              label="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 glass rounded-lg text-white border border-white/20"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm text-white/90">Active</label>
            </div>
            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">{editingCategory ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
