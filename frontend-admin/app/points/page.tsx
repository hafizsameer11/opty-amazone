'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import { adminService } from '@/services/admin-service';
import { useToast } from '@/components/ui/Toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface PointRule {
  id: number;
  name: string;
  type: string;
  points_per_euro?: number;
  fixed_points?: number;
  min_purchase_amount?: number;
  max_points_per_transaction?: number;
  points_expiry_days?: number;
  redemption_rate?: number;
  min_redemption_points?: number;
  max_redemption_per_order?: number;
  is_active: boolean;
  conditions?: any;
}

interface PointTransaction {
  id: number;
  user_id: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  type: string;
  points: number;
  balance_after: number;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  created_at: string;
}

export default function PointsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'rules' | 'transactions'>('rules');
  const [rules, setRules] = useState<PointRule[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<PointRule | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [formData, setFormData] = useState<Partial<PointRule>>({});

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'rules') {
        const data = await adminService.getPointRules();
        setRules(data || []);
      } else {
        const response = await adminService.getPointTransactions({ per_page: 50 });
        setTransactions(response.data || []);
      }
    } catch (error) {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRule = (rule: PointRule) => {
    setEditingRule(rule);
    setFormData(rule);
    setShowRuleForm(true);
  };

  const handleNewRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      type: 'purchase',
      is_active: true,
    });
    setShowRuleForm(true);
  };

  const handleSaveRule = async () => {
    try {
      setSaving(true);
      await adminService.savePointRule(formData, editingRule?.id);
      showToast('success', editingRule ? 'Rule updated successfully' : 'Rule created successfully');
      setShowRuleForm(false);
      setEditingRule(null);
      setFormData({});
      loadData();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: 'Purchase',
      referral: 'Referral',
      review: 'Review',
      signup: 'Signup',
      birthday: 'Birthday',
      social_share: 'Social Share',
      redemption: 'Redemption',
    };
    return labels[type] || type;
  };

  const ruleColumns = [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'type',
      header: 'Type',
      render: (rule: PointRule) => (
        <Badge variant="default">{getTypeLabel(rule.type)}</Badge>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      render: (rule: PointRule) => (
        <span className="text-white">
          {rule.points_per_euro
            ? `${rule.points_per_euro} per €`
            : rule.fixed_points
            ? `${rule.fixed_points} fixed`
            : 'N/A'}
        </span>
      ),
    },
    {
      key: 'redemption',
      header: 'Redemption',
      render: (rule: PointRule) => (
        <span className="text-white">
          {rule.redemption_rate ? `€1 = ${rule.redemption_rate} pts` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (rule: PointRule) => (
        <Badge variant={rule.is_active ? 'success' : 'default'}>
          {rule.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (rule: PointRule) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEditRule(rule)}
        >
          Edit
        </Button>
      ),
    },
  ];

  const transactionColumns = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'user',
      header: 'User',
      render: (tx: PointTransaction) => (
        <span className="text-white">
          {tx.user?.name || `User #${tx.user_id}`}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (tx: PointTransaction) => (
        <Badge variant="default">{getTypeLabel(tx.type)}</Badge>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      render: (tx: PointTransaction) => (
        <span className={`font-semibold ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {tx.points > 0 ? '+' : ''}{tx.points}
        </span>
      ),
    },
    {
      key: 'balance_after',
      header: 'Balance After',
      render: (tx: PointTransaction) => (
        <span className="text-white">{tx.balance_after}</span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (tx: PointTransaction) => (
        <span className="text-white/70 text-sm">{tx.description || 'N/A'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (tx: PointTransaction) => (
        <span className="text-white/70 text-sm">
          {new Date(tx.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Points Management</h1>
          <p className="text-white/70">Manage point rules and view transactions</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-white/20">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-white border-b-2 border-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Point Rules
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-white border-b-2 border-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Transactions
          </button>
        </div>

        {activeTab === 'rules' && (
          <GlassCard>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Point Rules</h2>
              <Button onClick={handleNewRule}>Create New Rule</Button>
            </div>

            {showRuleForm && (
              <div className="mb-6 p-6 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {editingRule ? 'Edit Rule' : 'Create New Rule'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">Type</label>
                    <select
                      value={formData.type || 'purchase'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      <option value="purchase">Purchase</option>
                      <option value="referral">Referral</option>
                      <option value="review">Review</option>
                      <option value="signup">Signup</option>
                      <option value="birthday">Birthday</option>
                      <option value="social_share">Social Share</option>
                      <option value="redemption">Redemption</option>
                    </select>
                  </div>
                  <Input
                    label="Points Per Euro"
                    type="number"
                    step="0.01"
                    value={formData.points_per_euro || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, points_per_euro: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label="Fixed Points"
                    type="number"
                    step="0.01"
                    value={formData.fixed_points || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, fixed_points: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label="Redemption Rate (points per €1)"
                    type="number"
                    step="0.01"
                    value={formData.redemption_rate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, redemption_rate: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label="Min Redemption Points"
                    type="number"
                    step="0.01"
                    value={formData.min_redemption_points || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, min_redemption_points: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label="Max Redemption Per Order (€)"
                    type="number"
                    step="0.01"
                    value={formData.max_redemption_per_order || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, max_redemption_per_order: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active || false}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label htmlFor="is_active" className="text-white/80">
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <Button onClick={handleSaveRule} isLoading={saving}>
                    {editingRule ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRuleForm(false);
                      setEditingRule(null);
                      setFormData({});
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <DataTable
              data={rules}
              columns={ruleColumns}
              loading={false}
              keyExtractor={(rule) => rule.id}
            />
          </GlassCard>
        )}

        {activeTab === 'transactions' && (
          <GlassCard>
            <h2 className="text-xl font-bold text-white mb-6">Point Transactions</h2>
            <DataTable
              data={transactions}
              columns={transactionColumns}
              loading={false}
              keyExtractor={(tx) => tx.id}
            />
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  );
}
