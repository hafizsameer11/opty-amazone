'use client';

import { Fragment, useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  categoryService,
  type Category,
  type CreateCategoryData,
  type UpdateCategoryPayload,
} from '@/services/category-service';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

function categoryMatches(c: Category, q: string): boolean {
  const s = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(s) ||
    (c.name_it && c.name_it.toLowerCase().includes(s)) ||
    c.slug.toLowerCase().includes(s)
  );
}
function filterTree(nodes: Category[], q: string): Category[] {
  if (!q.trim()) return nodes;
  const out: Category[] = [];
  for (const c of nodes) {
    const childFiltered = c.children?.length ? filterTree(c.children, q) : [];
    const selfMatch = categoryMatches(c, q);
    if (selfMatch) {
      out.push({ ...c, children: c.children });
    } else if (childFiltered.length > 0) {
      out.push({ ...c, children: childFiltered });
    }
  }
  return out;
}

function flattenForParentSelect(nodes: Category[], depth = 0, excludeId?: number): { id: number; label: string }[] {
  const rows: { id: number; label: string }[] = [];
  for (const c of nodes) {
    if (excludeId != null && c.id === excludeId) continue;
    const pad = depth > 0 ? `${'â€” '.repeat(depth)}` : '';
    rows.push({ id: c.id, label: `${pad}${c.name}` });
    if (c.children?.length) {
      rows.push(...flattenForParentSelect(c.children, depth + 1, excludeId));
    }
  }
  return rows;
}

function CategoryTreeRows({
  nodes,
  depth,
  onEdit,
  t,
}: {
  nodes: Category[];
  depth: number;
  onEdit: (c: Category) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <>
      {nodes.map((cat) => (
        <Fragment key={cat.id}>
          <div
            className="glass rounded-lg p-4 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-100"
            style={{ marginLeft: depth * 14 }}
          >
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">
                {cat.name}
                {cat.name_it ? (
                  <span className="text-slate-500 font-normal"> Â· {cat.name_it}</span>
                ) : null}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono truncate">{cat.slug}</p>
              {cat.description ? (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant={cat.is_active ? 'success' : 'default'}>
                {cat.is_active ? t('active') : t('inactive')}
              </Badge>
              <Button size="sm" variant="ghost" onClick={() => onEdit(cat)}>
                {t('editItalianSettings')}
              </Button>
            </div>
          </div>
          {cat.children && cat.children.length > 0 ? (
            <CategoryTreeRows nodes={cat.children} depth={depth + 1} onEdit={onEdit} t={t} />
          ) : null}
        </Fragment>
      ))}
    </>
  );
}

const emptyCreate: CreateCategoryData = {
  name: '',
  slug: '',
  name_it: '',
  description: '',
  parent_id: null,
  sort_order: 0,
  is_active: true,
};

export default function CategoriesPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [createForm, setCreateForm] = useState<CreateCategoryData>(emptyCreate);
  const [editForm, setEditForm] = useState<UpdateCategoryPayload & { sort_order: number }>({
    name_it: '',
    description: '',
    sort_order: 0,
    is_active: true,
  });

  const parentOptions = useMemo(() => flattenForParentSelect(tree), [tree]);

  const displayedTree = useMemo(() => filterTree(tree, appliedSearch), [tree, appliedSearch]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await categoryService.getAll();
      setTree(data || []);
    } catch {
      setLoadError(t('couldNotLoadCategories'));
      showToast('error', t('categoryLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(loadCategories);

  useEffect(() => {
    void loadCategories();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchDraft.trim());
  };

  const openCreate = () => {
    setCreateForm({ ...emptyCreate, sort_order: 0 });
    setShowCreateModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditForm({
      name_it: cat.name_it || '',
      description: cat.description || '',
      sort_order: cat.sort_order ?? 0,
      is_active: !!cat.is_active,
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: CreateCategoryData = {
        ...createForm,
        slug: createForm.slug || createForm.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        parent_id: createForm.parent_id ? Number(createForm.parent_id) : null,
        name_it: createForm.name_it?.trim() || undefined,
        sort_order: Number(createForm.sort_order) || 0,
      };
      await categoryService.create(payload);
      showToast('success', t('categoryCreated'));
      setShowCreateModal(false);
      void loadCategories();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || t('categoryCreateFailed'));
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      await categoryService.update(editingCategory.id, {
        name_it: editForm.name_it?.trim() || null,
        description: editForm.description,
        sort_order: Number(editForm.sort_order) || 0,
        is_active: editForm.is_active,
      });
      showToast('success', t('categoryUpdated'));
      setShowEditModal(false);
      setEditingCategory(null);
      void loadCategories();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || t('categoryUpdateFailed'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('categories')}</h1>
            <p className="text-slate-500">
              {t('categoriesDescription')}
            </p>
          </div>
          <Button onClick={openCreate}>{t('createCategory')}</Button>
        </div>

        <GlassCard>
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 mb-6">
            <Input
              type="text"
              value={searchDraft}
              {...{ placeholder: t('searchCategories') }}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Button type="submit">{t('filter')}</Button>
          </form>

          {loadError && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-slate-900">
              <p className="text-sm flex-1">{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadCategories()}>
                {t('retry')}
              </Button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-slate-500">{t('loading')}</div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-slate-500">{t('noCategories')}</div>
          ) : displayedTree.length === 0 ? (
            <div className="text-center py-12 text-slate-500">{t('noCategoriesMatch')}</div>
          ) : (
            <div className="space-y-2">
              <CategoryTreeRows nodes={displayedTree} depth={0} onEdit={openEdit} t={t} />
            </div>
          )}
        </GlassCard>

        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={t('createCategory')} size="lg">
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <p className="text-sm text-slate-500">
              {t('categoryCreateDescription')}
            </p>
            <Input
              label={t('englishNameFixed')}
              value={createForm.name}
              onChange={(e) => {
                const name = e.target.value;
                setCreateForm((f) => ({
                  ...f,
                  name,
                  slug: f.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                }));
              }}
              required
            />
            <Input
              label={t('urlSlug')}
              value={createForm.slug}
              onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
              required
            />
            <Input
              label={t('italianTitleOptional')}
              value={createForm.name_it || ''}
              onChange={(e) => setCreateForm((f) => ({ ...f, name_it: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('parentOptional')}</label>
              <select
                value={createForm.parent_id ?? ''}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    parent_id: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
              >
                <option value="">{t('topLevel')}</option>
                {parentOptions.map((o) => (
                  <option key={o.id} value={o.id} className="bg-gray-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('description')}</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
                rows={3}
              />
            </div>
            <Input
              label={t('sortOrder')}
              type="number"
              value={String(createForm.sort_order ?? 0)}
              onChange={(e) => setCreateForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="c_active"
                checked={!!createForm.is_active}
                onChange={(e) => setCreateForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="c_active" className="text-sm text-slate-700">{t('active')}</label>
            </div>
            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>{t('cancel')}</Button>
              <Button type="submit">{t('create')}</Button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title={t('editItalianSettings')} size="lg">
          {editingCategory && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <p className="text-sm text-slate-500">
                {t('categoryEditDescription')}
              </p>
              <Input label={t('englishNameReadOnly')} value={editingCategory.name} disabled className="opacity-70" />
              <Input label={t('slugReadOnly')} value={editingCategory.slug} disabled className="opacity-70" />
              <Input
                label={t('italianTitle')}
                value={editForm.name_it || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, name_it: e.target.value }))}
                placeholder={t('italianTitle')}
              />
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">{t('description')}</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
                  rows={3}
                />
              </div>
              <Input
                label={t('sortOrder')}
                type="number"
                value={String(editForm.sort_order)}
                onChange={(e) => setEditForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="e_active"
                  checked={!!editForm.is_active}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="e_active" className="text-sm text-slate-700">{t('active')}</label>
              </div>
              <div className="flex gap-4 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>{t('cancel')}</Button>
                <Button type="submit">{t('save')}</Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
