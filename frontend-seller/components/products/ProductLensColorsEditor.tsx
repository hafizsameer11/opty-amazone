'use client';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export interface ProductLensColorRow {
  id: number;
  name: string;
  color_code: string;
  description?: string;
}

interface ProductLensColorsEditorProps {
  value: ProductLensColorRow[];
  onChange: (colors: ProductLensColorRow[]) => void;
  compact?: boolean;
}

function nextId(rows: ProductLensColorRow[]): number {
  if (!rows.length) return 1;
  return Math.max(...rows.map((r) => r.id), 0) + 1;
}

const PRESETS: Omit<ProductLensColorRow, 'id'>[] = [
  { name: 'Clear', color_code: '#FFFFFF', description: 'Transparent clear lenses' },
  { name: 'Blue', color_code: '#4A90E2', description: 'Blue tinted lenses' },
  { name: 'Green', color_code: '#50C878', description: 'Green tinted lenses' },
  { name: 'Brown', color_code: '#8B4513', description: 'Brown tinted lenses' },
  { name: 'Gray', color_code: '#808080', description: 'Gray tinted lenses' },
];

export default function ProductLensColorsEditor({
  value,
  onChange,
  compact = false,
}: ProductLensColorsEditorProps) {
  const rows = Array.isArray(value) ? value : [];
  const pad = compact ? 'p-3' : 'p-5';
  const titleCls = compact ? 'text-sm font-semibold text-gray-900 mb-2' : 'text-base font-semibold text-gray-900 mb-3';

  const patch = (next: ProductLensColorRow[]) => onChange(next);

  const addRow = () => {
    patch([
      ...rows,
      {
        id: nextId(rows),
        name: '',
        color_code: '#4A90E2',
        description: '',
      },
    ]);
  };

  const addPreset = (preset: Omit<ProductLensColorRow, 'id'>) => {
    if (rows.some((r) => r.name.toLowerCase() === preset.name.toLowerCase())) return;
    patch([...rows, { ...preset, id: nextId(rows) }]);
  };

  const updateRow = (index: number, patchRow: Partial<ProductLensColorRow>) => {
    const next = [...rows];
    next[index] = { ...next[index], ...patchRow };
    patch(next);
  };

  const removeRow = (index: number) => {
    patch(rows.filter((_, i) => i !== index));
  };

  return (
    <div className={`bg-white ${pad} rounded-lg border border-gray-200`}>
      <div className={`flex flex-wrap items-start justify-between gap-2 ${compact ? 'mb-2' : 'mb-4'}`}>
        <div>
          <h3 className={titleCls}>Lens tint colors</h3>
          <p className={compact ? 'text-[11px] text-gray-500' : 'text-sm text-gray-500'}>
            Optional tints buyers can pick at checkout (clear, blue, brown, etc.).
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          Add color
        </Button>
      </div>

      {rows.length === 0 && (
        <div className={`flex flex-wrap gap-2 ${compact ? 'mb-2' : 'mb-4'}`}>
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => addPreset(preset)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium text-gray-700 hover:border-[#0066CC] hover:text-[#0066CC]"
            >
              <span
                className="w-3 h-3 rounded-full border border-gray-300"
                style={{ backgroundColor: preset.color_code }}
              />
              {preset.name}
            </button>
          ))}
        </div>
      )}

      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`grid grid-cols-1 md:grid-cols-[1fr_120px_1fr_auto] gap-2 items-end border border-gray-100 rounded-lg ${
              compact ? 'p-2' : 'p-3'
            }`}
          >
            <Input
              label="Name"
              value={row.name}
              onChange={(e) => updateRow(index, { name: e.target.value })}
              placeholder="Blue, Brown…"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hex</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(row.color_code) ? row.color_code : '#4A90E2'}
                  onChange={(e) => updateRow(index, { color_code: e.target.value })}
                  className="h-10 w-12 rounded border border-gray-300 cursor-pointer"
                  aria-label="Pick lens tint color"
                />
                <Input
                  value={row.color_code}
                  onChange={(e) => updateRow(index, { color_code: e.target.value })}
                  placeholder="#4A90E2"
                />
              </div>
            </div>
            <Input
              label="Description (optional)"
              value={row.description || ''}
              onChange={(e) => updateRow(index, { description: e.target.value })}
              placeholder="Short note for buyers"
            />
            <Button type="button" variant="danger" size="sm" onClick={() => removeRow(index)}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
