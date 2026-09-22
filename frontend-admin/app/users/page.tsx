'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import PaginationBar, { type PaginationMeta } from '@/components/ui/PaginationBar';
import { userService, type User, type CreateUserData } from '@/services/user-service';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { rowsAndMetaFromAdminList } from '@/lib/paginated-response';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

export default function UsersPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [blockedFilter, setBlockedFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'buyer',
  });

  const loadUsers = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      setLoadError(null);
      const params: Record<string, string | number> = { per_page: 20, page: pageNum };
      if (roleFilter) params.role = roleFilter;
      if (blockedFilter === 'blocked') params.is_blocked = 1;
      if (blockedFilter === 'active') params.is_blocked = 0;
      if (appliedSearch) params.search = appliedSearch;
      const response = await userService.getAll(params);
      const { rows, meta } = rowsAndMetaFromAdminList<User>(response);
      setUsers(rows);
      setPaginationMeta(meta);
    } catch {
      setLoadError(t('failedLoadUsers'));
      showToast('error', t('failedLoadUsers'));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, blockedFilter, appliedSearch, showToast]);

  useLiveRefresh(() => loadUsers(page));

  useEffect(() => {
    void loadUsers(page);
  }, [page, roleFilter, blockedFilter, loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchDraft.trim());
    setPage(1);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', phone: '', password: '', role: 'buyer' });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role as CreateUserData['role'],
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userService.update(editingUser.id, formData);
        showToast('success', t('userUpdated'));
      } else {
        await userService.create(formData);
        showToast('success', t('userCreated'));
      }
      setShowModal(false);
      void loadUsers(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', t('failedSaveUser'));
    }
  };

  const handleDelete = async (id: number) => {
    if (authUser?.id === id) {
      showToast('error', t('cannotDeleteSelf'));
      return;
    }
    if (!confirm(t('confirmDeleteUser'))) return;
    try {
      await userService.delete(id);
      showToast('success', t('userDeleted'));
      void loadUsers(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', t('failedDeleteUser'));
    }
  };

  const handleToggleBlock = async (user: User) => {
    if (authUser?.id === user.id) {
      showToast('error', t('cannotBlockSelf'));
      return;
    }
    try {
      await userService.toggleStatus(user.id);
      showToast('success', user.is_blocked ? t('userUnblocked') : t('userBlocked'));
      void loadUsers(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', t('failedUpdateUser'));
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: t('name'), sortable: true },
    { key: 'email', header: t('email'), sortable: true },
    {
      key: 'role',
      header: t('role'),
      render: (user: User) => (
        <Badge variant={user.role === 'admin' ? 'info' : user.role === 'seller' ? 'success' : 'default'}>
          {t(user.role === 'buyer' ? 'buyer' : user.role === 'seller' ? 'seller' : 'admin')}
        </Badge>
      ),
    },
    {
      key: 'is_blocked',
      header: t('access'),
      render: (user: User) => (
        <Badge variant={user.is_blocked ? 'error' : 'success'}>
          {user.is_blocked ? t('blocked') : t('ok')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      render: (user: User) => (
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>{t('edit')}</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleBlock(user)}
            disabled={authUser?.id === user.id}
          >
            {user.is_blocked ? t('unblock') : t('block')}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(user.id)}
            disabled={authUser?.id === user.id}
          >
            {t('delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('users')}</h1>
            <p className="text-slate-500">{t('manageUsers')}</p>
          </div>
          <Button onClick={handleCreate}>{t('createUser')}</Button>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6">
            <Input
              type="text"
              placeholder={t('searchUsers')}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
            >
              <option value="">{t('allRoles')}</option>
              <option value="buyer">{t('buyer')}</option>
              <option value="seller">{t('seller')}</option>
              <option value="admin">{t('admin')}</option>
            </select>
            <select
              value={blockedFilter}
              onChange={(e) => {
                setBlockedFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
            >
              <option value="">{t('allAccess')}</option>
              <option value="active">{t('notBlocked')}</option>
              <option value="blocked">{t('blocked')}</option>
            </select>
            <Button type="submit">{t('search')}</Button>
          </form>

          {loadError && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-slate-900">
              <p className="text-sm flex-1">{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadUsers(page)}>
                {t('retry')}
              </Button>
            </div>
          )}

          <DataTable
            data={users}
            columns={columns}
            loading={loading}
            keyExtractor={(user) => user.id}
            onRowClick={(user) => { window.location.href = `/users/${user.id}`; }}
          />

          <PaginationBar
            meta={paginationMeta}
            loading={loading}
            onPageChange={(p) => setPage(p)}
          />
        </GlassCard>

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUser ? t('editUser') : t('createUser')}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label={t('email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label={t('phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label={editingUser ? t('newPassword') : t('password')}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{t('role')}</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as CreateUserData['role'] })}
                className="w-full px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
                required
              >
                <option value="buyer">{t('buyer')}</option>
                <option value="seller">{t('seller')}</option>
                <option value="admin">{t('admin')}</option>
              </select>
            </div>
            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>{t('cancel')}</Button>
              <Button type="submit">{editingUser ? t('update') : t('createUser')}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
