'use client';

import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  normalizeSizeRow,
  sizeRowText,
  sumSizes,
  type ParsedVariantSize,
} from '@/components/products/variantSizes';

interface VariantSizesDraftEditorProps {
  sizes?: ParsedVariantSize[] | null;
  onChange: (sizes: ParsedVariantSize[]) => void;
}

/**
 * Per-size rows for a colour variation, available from the moment the variant
 * is created.
 *
 * The rows are stored in the API shape (`size_label` plus optional dimensions)
 * so the variant can be submitted without a conversion step, and so the same
 * component serves both the pre-save draft editor and the post-save manager.
 */
export default function VariantSizesDraftEditor({
  sizes,
  onChange,
}: VariantSizesDraftEditorProps) {
  const { t } = useLanguage();
  const rows = sizes ?? [];

  const updateRow = (index: number, patch: Partial<ParsedVariantSize>) => {
    const next = rows.map((row, currentIndex) =>
      currentIndex === index ? { ...row, ...patch } : row
    );
    onChange(next);
  };

  const addRow = () => {
    const parsed = normalizeSizeRow('') ?? {
      lens_width: 0,
      bridge_width: 0,
      temple_length: 0,
      size_label: '',
    };
    onChange([...rows, { ...parsed, stock_quantity: 0, stock_status: 'in_stock' }]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleLabelChange = (index: number, text: string) => {
    const parsed = normalizeSizeRow(text);
    // An empty input removes the row rather than persisting a blank size.
    if (!parsed) {
      removeRow(index);
      return;
    }
    updateRow(index, parsed);
  };

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{t('form.sizesStockForColor')}</h4>
          <p className="text-xs text-slate-500">{t('form.sizesStockDescription')}</p>
        </div>
        <Button type="button" size="sm" onClick={addRow}>
          {t('form.addSize')}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{t('form.noSizesYet')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2 pr-2 font-medium">{t('form.sizeAnyText')}</th>
                <th className="py-2 pr-2 font-medium">{t('form.stock')}</th>
                <th className="py-2 pr-2 font-medium">{t('common.status')}</th>
                <th className="py-2 font-medium">{t('form.action')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.size_label}-${index}`} className="border-b border-slate-100">
                  <td className="py-2 pr-2">
                    <input
                      value={sizeRowText(row)}
                      onChange={(event) => handleLabelChange(index, event.target.value)}
                      placeholder="12mm / Medium / 52-18-140"
                      aria-label={t('form.sizeAnyText')}
                      className="w-full rounded-md border border-slate-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="number"
                      min={0}
                      value={row.stock_quantity}
                      onChange={(event) =>
                        updateRow(index, {
                          stock_quantity: Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                        })
                      }
                      aria-label={t('form.stock')}
                      className="w-24 rounded-md border border-slate-300 px-2 py-1.5"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={row.stock_status ?? 'in_stock'}
                      onChange={(event) =>
                        updateRow(index, {
                          stock_status: event.target.value as ParsedVariantSize['stock_status'],
                        })
                      }
                      aria-label={t('common.status')}
                      className="rounded-md border border-slate-300 px-2 py-1.5"
                    >
                      <option value="in_stock">{t('form.inStock')}</option>
                      <option value="out_of_stock">{t('form.outOfStock')}</option>
                      <option value="backorder">{t('form.backorder')}</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <Button type="button" variant="danger" size="sm" onClick={() => removeRow(index)}>
                      {t('form.remove')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        {t('form.sizesTotalStock', { count: sumSizes(rows) })}
      </p>
    </div>
  );
}