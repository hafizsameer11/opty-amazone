'use client';

import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';
import Modal from '@/components/ui/Modal';
import {
  getProductPrescriptionConfig,
  updateProductPrescriptionConfig,
  type ProductPrescriptionConfigDetail,
  type PrescriptionDropdownValue,
} from '@/services/prescription-dropdown-service';
import { useLanguage } from '@/contexts/LanguageContext';

type ClFieldType = 'pwr' | 'sph' | 'cyl' | 'axis' | 'base_curve' | 'diameter';
type EyeFilterTab = 'all' | 'right' | 'left';

const FIELD_LABELS: Record<ClFieldType, string> = {
  pwr: 'PWR (Power)',
  sph: 'SPH (Sphere / power)',
  cyl: 'CYL (Cylinder)',
  axis: 'AXIS',
  base_curve: 'Base curve (B.C.)',
  diameter: 'Diameter (DIA)',
};

/** Shown next to the value field so sellers enter numbers in the right unit. */
const FIELD_UNITS: Record<ClFieldType, string> = {
  pwr: 'D',
  sph: 'D',
  cyl: 'D',
  axis: '°',
  base_curve: 'mm',
  diameter: 'mm',
};

const CL_FIELDS: ClFieldType[] = ['pwr', 'sph', 'cyl', 'axis', 'base_curve', 'diameter'];
/** Eye power is stored as one list in the API (pwr + sph are the same data). */
const NON_POWER_CL_FIELDS: ClFieldType[] = ['cyl', 'axis', 'base_curve', 'diameter'];
const EYE_TYPES = ['left', 'right'] as const;

function usesEyeTabs(field: ClFieldType): boolean {
  return field === 'pwr' || field === 'sph' || field === 'cyl' || field === 'axis';
}

interface ContactLensSpecificationEditorProps {
  productId: number;
}

type DraftValue = {
  value: string;
  label: string;
  eye_type: PrescriptionDropdownValue['eye_type'];
  sort_order: number;
};

const emptyDraft = (): DraftValue => ({
  value: '',
  label: '',
  eye_type: 'right',
  sort_order: 0,
});

export default function ContactLensSpecificationEditor({ productId }: ContactLensSpecificationEditorProps) {
  const { t } = useLanguage();
  const [config, setConfig] = useState<ProductPrescriptionConfigDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeField, setActiveField] = useState<ClFieldType>('pwr');
  const [eyeTab, setEyeTab] = useState<EyeFilterTab>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftValue>(emptyDraft());

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getProductPrescriptionConfig(productId);
      setConfig(data);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: string } } };
      const apiMsg = ax.response?.data?.message;
      setError(
        typeof apiMsg === 'string' && apiMsg.trim()
          ? apiMsg
          : ax.response?.status === 404
            ? t('form.prescriptionNotFound')
            : t('form.prescriptionLoadFailed')
      );
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [productId, t]);

  useEffect(() => {
    if (!usesEyeTabs(activeField)) {
      setEyeTab('all');
    }
  }, [activeField]);

  const showSphTab = useMemo(() => {
    if (!config) return true;
    if (typeof config.show_sph_tab === 'boolean') {
      return config.show_sph_tab;
    }
    // Legacy API: hid SPH only for “spherical” products; new rule is SPH only for astigmatism.
    if (config.is_spherical_contact_lens === true) {
      return false;
    }
    return true;
  }, [config]);

  const hideSphTab = !showSphTab;
  const visibleFieldTabs = useMemo(
    () => (hideSphTab ? CL_FIELDS.filter((ft) => ft !== 'sph') : CL_FIELDS),
    [hideSphTab]
  );

  useEffect(() => {
    if (!hideSphTab || activeField !== 'sph') return;
    setActiveField('pwr');
  }, [hideSphTab, activeField]);

  const filteredIndices = useMemo(() => {
    if (!config) return [];
    const list = config.values[activeField];
    if (!usesEyeTabs(activeField) || eyeTab === 'all') {
      return list.map((_, i) => i);
    }
    return list
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => {
        const e = v.eye_type || 'right';
        return e === eyeTab;
      })
      .map(({ i }) => i);
  }, [config, activeField, eyeTab]);

  const openAddModal = () => {
    const listLen = config?.values[activeField]?.length ?? 0;
    let defaultEye: PrescriptionDropdownValue['eye_type'] = 'right';
    if (usesEyeTabs(activeField)) {
      if (eyeTab === 'right' || eyeTab === 'left') defaultEye = eyeTab;
    }
    setDraft({
      ...emptyDraft(),
      sort_order: listLen,
      eye_type: defaultEye,
    });
    setEditingIndex(null);
    setModalOpen(true);
  };

  const openEditModal = (indexInFullList: number) => {
    if (!config) return;
    const v = config.values[activeField][indexInFullList];
    setDraft({
      value: v.value,
      label: v.label || '',
      eye_type: v.eye_type === 'left' || v.eye_type === 'right' ? v.eye_type : 'right',
      sort_order: v.sort_order,
    });
    setEditingIndex(indexInFullList);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingIndex(null);
    setDraft(emptyDraft());
  };

  const applyModal = () => {
    if (!config || !draft.value.trim()) return;
    const categoryId = config.product.category_id;
    let valueText = draft.value.trim();
    // Normalize DIA / BC / diopter-style fields to two decimals (e.g. 14.5 → 14.50).
    if (['pwr', 'sph', 'cyl', 'base_curve', 'diameter'].includes(activeField)) {
      const n = parseFloat(valueText.replace(',', '.'));
      if (Number.isFinite(n)) {
        valueText = n.toFixed(2);
      }
    }
    if (editingIndex === null) {
      const shouldMirrorBothEyes = usesEyeTabs(activeField) && eyeTab === 'all';
      const now = new Date().toISOString();
      const newValues: PrescriptionDropdownValue[] = shouldMirrorBothEyes
        ? (['right', 'left'] as const).map((eye, idx) => ({
            id: Date.now() + idx,
            store_id: 0,
            category_id: categoryId,
            field_type: activeField,
            value: valueText,
            label: draft.label.trim() || valueText,
            eye_type: eye,
            form_type: 'contact_lens',
            is_active: true,
            sort_order: draft.sort_order + idx,
            created_at: now,
            updated_at: now,
          }))
        : [
            {
              id: Date.now(),
              store_id: 0,
              category_id: categoryId,
              field_type: activeField,
              value: valueText,
              label: draft.label.trim() || valueText,
              eye_type: usesEyeTabs(activeField) ? draft.eye_type : undefined,
              form_type: 'contact_lens',
              is_active: true,
              sort_order: draft.sort_order,
              created_at: now,
              updated_at: now,
            },
          ];
      setConfig({
        ...config,
        values: {
          ...config.values,
          [activeField]: [...config.values[activeField], ...newValues],
        },
      });
    } else {
      const row = [...config.values[activeField]];
      row[editingIndex] = {
        ...row[editingIndex],
        value: valueText,
        label: draft.label.trim() || valueText,
        eye_type: usesEyeTabs(activeField) ? draft.eye_type : undefined,
        sort_order: draft.sort_order,
      };
      setConfig({
        ...config,
        values: { ...config.values, [activeField]: row },
      });
    }
    closeModal();
  };

  const handleDeleteValue = (indexInFullList: number) => {
    if (!config) return;
    setConfig({
      ...config,
      values: {
        ...config.values,
        [activeField]: config.values[activeField].filter((_, i) => i !== indexInFullList),
      },
    });
  };

  const handleBulkImport = (text: string) => {
    if (!config || !text.trim()) return;
    const parts = text
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
    const shouldMirrorBothEyes = usesEyeTabs(activeField) && eyeTab === 'all';
    const defaultEye: PrescriptionDropdownValue['eye_type'] =
      usesEyeTabs(activeField) && (eyeTab === 'right' || eyeTab === 'left') ? eyeTab : 'right';
    const now = new Date().toISOString();
    const newRows: PrescriptionDropdownValue[] = shouldMirrorBothEyes
      ? parts.flatMap((value, index) =>
          (['right', 'left'] as const).map((eye, eyeIdx) => ({
            id: Date.now() + index * 2 + eyeIdx,
            store_id: 0,
            category_id: config.product.category_id,
            field_type: activeField,
            value,
            label: value,
            eye_type: eye,
            form_type: 'contact_lens',
            is_active: true,
            sort_order: config.values[activeField].length + index * 2 + eyeIdx,
            created_at: now,
            updated_at: now,
          }))
        )
      : parts.map((value, index) => ({
          id: Date.now() + index,
          store_id: 0,
          category_id: config.product.category_id,
          field_type: activeField,
          value,
          label: value,
          eye_type: usesEyeTabs(activeField) ? defaultEye : undefined,
          form_type: 'contact_lens',
          is_active: true,
          sort_order: config.values[activeField].length + index,
          created_at: now,
          updated_at: now,
        }));
    setConfig({
      ...config,
      values: {
        ...config.values,
        [activeField]: [...config.values[activeField], ...newRows],
      },
    });
  };

  const copyRightEyeToLeft = () => {
    if (!config || !usesEyeTabs(activeField)) return;
    const list = config.values[activeField];
    const rights = list.filter((v) => v.eye_type === 'right');
    if (rights.length === 0) return;
    let offset = 0;
    const clones: PrescriptionDropdownValue[] = rights.map((v, i) => ({
      ...v,
      id: Date.now() + i + offset++,
      eye_type: 'left',
      label: v.label ? `${v.label} (L)` : v.value,
      sort_order: list.length + i,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    setConfig({
      ...config,
      values: {
        ...config.values,
        [activeField]: [...list, ...clones],
      },
    });
  };

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      // Merge PWR + SPH (both map to DB `sph`) so edits on either tab are kept for toric lenses.
      const powerMerged = [...config.values.pwr, ...config.values.sph];
      const seenPower = new Set<string>();
      const powerValues = powerMerged.filter((v) => {
        if (!v.value.trim()) return false;
        const key = `${v.value.trim()}|${v.eye_type || ''}`;
        if (seenPower.has(key)) return false;
        seenPower.add(key);
        return true;
      });
      const allValues = [
        ...powerValues,
        ...NON_POWER_CL_FIELDS.flatMap((ft) => config.values[ft]),
      ].filter((v) => v.value.trim() !== '');
      await updateProductPrescriptionConfig(productId, {
        values: allValues.map((v) => ({
          field_type: v.field_type === 'pwr' ? 'pwr' : v.field_type,
          value: v.value,
          label: v.label || undefined,
          eye_type: v.eye_type || undefined,
          is_active: v.is_active,
          sort_order: v.sort_order,
        })),
      });
      setSuccess(t('form.prescriptionSaved'));
      await load();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || t('form.prescriptionSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
        <Loader />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <Button type="button" onClick={load} className="bg-teal-600 hover:bg-teal-700 text-white">
          {t('form.retry')}
        </Button>
      </div>
    );
  }

  const unitHint = FIELD_UNITS[activeField];
  const modalTitle =
    editingIndex === null
      ? `${t('form.add')} ${t(FIELD_LABELS[activeField])}`
      : `${t('form.edit')} ${t(FIELD_LABELS[activeField])}`;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-5 sm:px-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{t('form.contactPrescriptionOptions')}</h2>
        <p className="text-cyan-100 mt-1 text-sm">
          {t('form.prescriptionDescription')}
          {hideSphTab && <> {t('form.sphericalPrescriptionHint')}</>}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {/* Field tabs */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/80">
          <nav className="flex overflow-x-auto border-b border-gray-200 bg-white">
            {visibleFieldTabs.map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => setActiveField(ft)}
                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeField === ft
                    ? 'border-teal-500 text-teal-700 bg-teal-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="hidden sm:inline">{t(FIELD_LABELS[ft])}</span>
                <span className="sm:hidden">{ft.toUpperCase()}</span>
                <span className="ml-1 text-xs text-gray-400">({config.values[ft]?.length || 0})</span>
              </button>
            ))}
          </nav>

          {/* Eye tabs (power / cyl / axis only) */}
          {usesEyeTabs(activeField) && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">{t('form.eye')}</span>
                {(['all', 'right', 'left'] as const).map((tab) => (
                <button
                    key={tab}
                  type="button"
                    onClick={() => setEyeTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                      eyeTab === tab
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'all' ? t('common.all') : tab === 'right' ? t('form.rightEye') : t('form.leftEye')}
                </button>
              ))}
              <button
                type="button"
                onClick={copyRightEyeToLeft}
                className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span aria-hidden>⎘</span>
                {t('form.copyRightLeft')}
              </button>
            </div>
          )}

          <div className="p-4 sm:p-5 space-y-4 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t(FIELD_LABELS[activeField])}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t('form.unitForNumeric')} <strong>{unitHint}</strong>
                  {activeField === 'sph' || activeField === 'cyl'
                    ? t('form.dioptersHint')
                    : activeField === 'axis'
                      ? t('form.axisHint')
                      : t('form.millimetresHint')}
                </p>
              </div>
              <Button
                type="button"
                onClick={openAddModal}
                className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
              >
                {t('form.addValue')}
              </Button>
            </div>

            <details className="group rounded-lg border border-dashed border-gray-300 bg-gray-50/50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 list-none flex items-center gap-2">
                <span className="text-teal-600">▸</span>
                 {t('form.bulkImport')}
              </summary>
              <div className="px-4 pb-4">
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={3}
                  placeholder={
                    usesEyeTabs(activeField) && eyeTab !== 'all'
                      ? t('form.bulkImportCurrentEye', { eye: eyeTab })
                      : t('form.bulkImportExample')
                  }
                  onBlur={(e) => {
                    if (e.target.value.trim()) {
                      handleBulkImport(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
            </details>

            {filteredIndices.length === 0 ? (
              <p className="text-gray-500 text-center py-10 text-sm rounded-xl border border-gray-100 bg-gray-50/30">
                {t('form.noPrescriptionValues')}
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredIndices.map((idx) => {
                  const v = config.values[activeField][idx];
                  const eye = v.eye_type || (usesEyeTabs(activeField) ? 'right' : '—');
                  return (
                    <li
                      key={`${v.id}-${idx}`}
                      className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2 bg-white shadow-sm hover:border-teal-200 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-lg font-semibold text-gray-900">
                            {v.value}
                            <span className="text-sm font-normal text-gray-500 ml-1">{unitHint}</span>
                          </p>
                          {v.label && v.label !== v.value && (
                            <p className="text-xs text-gray-500 truncate">{v.label}</p>
                          )}
                        </div>
                        {usesEyeTabs(activeField) && (
                          <span className="text-xs font-medium uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {eye}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{t('form.sort')}: {v.sort_order}</p>
                      <div className="flex gap-2 mt-auto pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 text-sm py-1.5"
                          onClick={() => openEditModal(idx)}
                        >
                          {t('form.edit')}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleDeleteValue(idx)}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm py-1.5 px-3"
                        >
                          {t('form.remove')}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white min-w-[180px]"
          >
            {saving ? t('common.saving') : t('form.saveSpecifications')}
          </Button>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={modalTitle} size="md">
        <div className="space-y-4">
          <div className="rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-sm text-sky-900">
            {t('form.productReference', { id: config.product.id })} · {config.product.name}
          </div>
          <Input
            label={t('form.valueWithUnit', { unit: unitHint })}
            value={draft.value}
            onChange={(e) => setDraft((d) => ({ ...d, value: e.target.value }))}
            placeholder={t(activeField === 'axis' ? 'form.axisExample' : 'form.powerExample')}
            required
          />
          <Input
            label={t('form.labelOptionalBuyer')}
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
          {usesEyeTabs(activeField) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.eye')}</label>
              <select
                value={draft.eye_type === 'left' || draft.eye_type === 'right' ? draft.eye_type : 'right'}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    eye_type: e.target.value as PrescriptionDropdownValue['eye_type'],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {EYE_TYPES.map((eye) => (
                  <option key={eye} value={eye}>
                    {eye === 'right' ? t('form.rightEye') : t('form.leftEye')}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Input
            label={t('form.sortOrder')}
            type="number"
            value={draft.sort_order}
            onChange={(e) => setDraft((d) => ({ ...d, sort_order: parseInt(e.target.value, 10) || 0 }))}
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={closeModal}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={applyModal}
              disabled={!draft.value.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {editingIndex === null ? t('form.add') : t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
