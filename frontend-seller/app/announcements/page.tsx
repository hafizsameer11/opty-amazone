'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { announcementService, type Announcement } from '@/services/announcement-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function AnnouncementsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    start_date: '',
    end_date: '',
    is_active: true,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAnnouncements();
    }
  }, [isAuthenticated]);

  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const response = await announcementService.getAll();
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setAnnouncements(response);
      } else if (response?.data) {
        setAnnouncements(response.data);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Failed to load announcements:', error);
      setError('Failed to load announcements');
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const data = {
        title: formData.title,
        message: formData.message,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        is_active: formData.is_active,
      };

      if (editingAnnouncement) {
        await announcementService.update(editingAnnouncement.id, data);
        setSuccess('Announcement updated successfully');
      } else {
        await announcementService.create(data);
        setSuccess('Announcement created successfully');
      }

      resetForm();
      loadAnnouncements();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      start_date: announcement.start_date ? announcement.start_date.split('T')[0] : '',
      end_date: announcement.end_date ? announcement.end_date.split('T')[0] : '',
      is_active: announcement.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await announcementService.delete(id);
      setSuccess('Announcement deleted successfully');
      loadAnnouncements();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await announcementService.toggle(id);
      loadAnnouncements();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to toggle announcement');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      start_date: '',
      end_date: '',
      is_active: true,
    });
    setEditingAnnouncement(null);
    setShowForm(false);
  };

  if (loading || loadingAnnouncements) {
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
                    <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-gray-600 mt-1">Manage your store announcements</p>
                  </div>
                  <Button onClick={() => setShowForm(true)}>
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Announcement
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
                      {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input
                        label="Title *"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message *
                        </label>
                        <textarea
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          rows={4}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Start Date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />

                        <Input
                          label="End Date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          min={formData.start_date}
                        />
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="mr-2"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                          Active
                        </label>
                      </div>

                      <div className="flex gap-4">
                        <Button type="submit" className="flex-1">
                          {editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                        </Button>
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {announcements.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new announcement.</p>
                    <div className="mt-6">
                      <Button onClick={() => setShowForm(true)}>Add Announcement</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                announcement.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {announcement.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-gray-600 mb-3 whitespace-pre-wrap">{announcement.message}</p>
                            <div className="flex gap-4 text-sm text-gray-500">
                              {announcement.start_date && (
                                <span>Start: {new Date(announcement.start_date).toLocaleDateString()}</span>
                              )}
                              {announcement.end_date && (
                                <span>End: {new Date(announcement.end_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              onClick={() => handleEdit(announcement)}
                              className="text-sm"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleToggle(announcement.id)}
                              className="text-sm"
                            >
                              {announcement.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleDelete(announcement.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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

