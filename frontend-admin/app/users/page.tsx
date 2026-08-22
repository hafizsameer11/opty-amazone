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

export default function UsersPage() {
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
      setLoadError('Could not load users. Check your connection and try again.');
      showToast('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, blockedFilter, appliedSearch, showToast]);

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
        showToast('success', 'User updated successfully');
      } else {
        await userService.create(formData);
        showToast('success', 'User created successfully');
      }
      setShowModal(false);
      void loadUsers(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: number) => {
    if (authUser?.id === id) {
      showToast('error', 'You cannot delete your own account from here.');
      return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await userService.delete(id);
      showToast('success', 'User deleted successfully');
      void loadUsers(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleBlock = async (user: User) => {
    if (authUser?.id === user.id) {
      showToast('error', 'You cannot change block status on your own account.');
      return;
    }
    try {
      await userService.toggleStatus(user.id);
      showToast('success', user.is_blocked ? 'User unblocked' : 'User blocked');
      void loadUsers(page);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Failed to update user');
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    {
      key: 'role',
      header: 'Role',
      render: (user: User) => (
        <Badge variant={user.role === 'admin' ? 'info' : user.role === 'seller' ? 'success' : 'default'}>
          {user.role}
        </Badge>
      ),
    },
    {
      key: 'is_blocked',
      header: 'Access',
      render: (user: User) => (
        <Badge variant={user.is_blocked ? 'error' : 'success'}>
          {user.is_blocked ? 'Blocked' : 'OK'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: User) => (
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>Edit</Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleBlock(user)}
            disabled={authUser?.id === user.id}
          >
            {user.is_blocked ? 'Unblock' : 'Block'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDelete(user.id)}
            disabled={authUser?.id === user.id}
          >
            Delete
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Users</h1>
            <p className="text-slate-500">Create, block, and remove buyers, sellers, and admins</p>
          </div>
          <Button onClick={handleCreate}>Create User</Button>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search users..."
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
              <option value="">All roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={blockedFilter}
              onChange={(e) => {
                setBlockedFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
            >
              <option value="">All access</option>
              <option value="active">Not blocked</option>
              <option value="blocked">Blocked</option>
            </select>
            <Button type="submit">Search</Button>
          </form>

          {loadError && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-slate-900">
              <p className="text-sm flex-1">{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadUsers(page)}>
                Retry
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

        <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Create User'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label={editingUser ? 'New password (leave empty to keep current)' : 'Password'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as CreateUserData['role'] })}
                className="w-full px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
                required
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-4 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit">{editingUser ? 'Update' : 'Create'}</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
