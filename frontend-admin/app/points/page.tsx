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
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

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
  conditions?: unknown;
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
  const { t } = useLanguage();
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
    } catch {
      showToast('error', t('failedLoadPoints'));
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(loadData);

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
      showToast('success', editingRule ? t('ruleUpdated') : t('ruleCreated'));
      setShowRuleForm(false);
      setEditingRule(null);
      setFormData({});
      loadData();
    } catch {
      showToast('error', t('failedSaveRule'));
    } finally {
      setSaving(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
       purchase: t('purchase'), referral: t('referral'), review: t('review'), signup: t('signup'), birthday: t('birthday'), social_share: t('socialShare'), redemption: t('redemption'),
    };
    return labels[type] || type;
  };

  const ruleColumns = [
    { key: 'name', header: t('ruleName'), sortable: true },
    {
      key: 'type',
       header: t('pointType'),
      render: (rule: PointRule) => (
        <Badge variant="default">{getTypeLabel(rule.type)}</Badge>
      ),
    },
    {
      key: 'points',
       header: t('points'),
      render: (rule: PointRule) => (
        <span className="text-slate-900">
          {rule.points_per_euro
            ? `${rule.points_per_euro} per €`
            : rule.fixed_points
            ? `${rule.fixed_points} fixed`
             : t('notAvailable')}
        </span>
      ),
    },
    {
      key: 'redemption',
       header: t('redemption'),
      render: (rule: PointRule) => (
        <span className="text-slate-900">
          {rule.redemption_rate ? `€1 = ${rule.redemption_rate} ${t('points').toLowerCase()}` : t('notAvailable')}
        </span>
      ),
    },
    {
      key: 'is_active',
       header: t('ruleStatus'),
      render: (rule: PointRule) => (
        <Badge variant={rule.is_active ? 'success' : 'default'}>
           {rule.is_active ? t('active') : t('inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
       header: t('ruleActions'),
      render: (rule: PointRule) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleEditRule(rule)}
        >
          {t('edit')}
        </Button>
      ),
    },
  ];

  const transactionColumns = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'user',
       header: t('supportUser'),
      render: (tx: PointTransaction) => (
        <span className="text-slate-900">
          {tx.user?.name || `User #${tx.user_id}`}
        </span>
      ),
    },
    {
      key: 'type',
       header: t('pointType'),
      render: (tx: PointTransaction) => (
        <Badge variant="default">{getTypeLabel(tx.type)}</Badge>
      ),
    },
    {
      key: 'points',
       header: t('points'),
      render: (tx: PointTransaction) => (
        <span className={`font-semibold ${tx.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {tx.points > 0 ? '+' : ''}{tx.points}
        </span>
      ),
    },
    {
      key: 'balance_after',
       header: t('balanceAfter'),
      render: (tx: PointTransaction) => (
        <span className="text-slate-900">{tx.balance_after}</span>
      ),
    },
    {
      key: 'description',
       header: t('pointDescription'),
      render: (tx: PointTransaction) => (
        <span className="text-slate-500 text-sm">{tx.description || t('notAvailable')}</span>
      ),
    },
    {
      key: 'created_at',
       header: t('date'),
      render: (tx: PointTransaction) => (
        <span className="text-slate-500 text-sm">
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('pointManagement')}</h1>
          <p className="text-slate-500">{t('pointsDescription')}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-slate-900 border-b-2 border-white'
                : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('pointRules')}
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'text-slate-900 border-b-2 border-white'
                : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            {t('transactions')}
          </button>
        </div>

        {activeTab === 'rules' && (
          <GlassCard>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">{t('pointRules')}</h2>
              <Button onClick={handleNewRule}>{t('createNewRule')}</Button>
            </div>

            {showRuleForm && (
              <div className="mb-6 p-6 bg-white/5 rounded-lg border border-slate-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  {editingRule ? t('editRule') : t('createNewRule')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t('ruleName')}
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">{t('pointType')}</label>
                    <select
                      value={formData.type || 'purchase'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066CC]/30"
                    >
                      <option value="purchase">{t('purchase')}</option>
                      <option value="referral">{t('referral')}</option>
                      <option value="review">{t('review')}</option>
                      <option value="signup">{t('signup')}</option>
                      <option value="birthday">{t('birthday')}</option>
                      <option value="social_share">{t('socialShare')}</option>
                      <option value="redemption">{t('redemption')}</option>
                    </select>
                  </div>
                  <Input
                    label={t('pointsPerEuro')}
                    type="number"
                    step="0.01"
                    value={formData.points_per_euro || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, points_per_euro: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label={t('fixedPoints')}
                    type="number"
                    step="0.01"
                    value={formData.fixed_points || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, fixed_points: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label={t('redemptionRate')}
                    type="number"
                    step="0.01"
                    value={formData.redemption_rate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, redemption_rate: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label={t('minRedemptionPoints')}
                    type="number"
                    step="0.01"
                    value={formData.min_redemption_points || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, min_redemption_points: parseFloat(e.target.value) || undefined })
                    }
                  />
                  <Input
                    label={t('maxRedemptionPerOrder')}
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
                    <label htmlFor="is_active" className="text-slate-600">
                      {t('active')}
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 mt-4">
                  <Button onClick={handleSaveRule} isLoading={saving}>
                    {editingRule ? t('updateRule') : t('create')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRuleForm(false);
                      setEditingRule(null);
                      setFormData({});
                    }}
                  >
                    {t('cancel')}
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
            <h2 className="text-xl font-bold text-slate-900 mb-6">{t('pointTransactions')}</h2>
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
