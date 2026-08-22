'use client';

import type { OrderLineSelections as OrderLineSelectionsType } from '@/types/order-line';

function SelectionRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 mt-1">
      <span className="font-medium text-gray-500 shrink-0">{label}:</span>
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">{children}</div>
    </div>
  );
}

export default function OrderLineSelections({
  line,
  className = '',
}: {
  line: OrderLineSelectionsType;
  className?: string;
}) {
  const pv = line.product_variant;
  const frameName = line.variant?.color_name ?? pv?.color_name;
  const frameCode = line.variant?.color_code ?? pv?.color_code;
  const lensTint = pv?.lens_color;

  const hasContact =
    line.contact_lens_pack_quantity != null ||
    line.contact_lens_left_base_curve != null ||
    line.contact_lens_left_diameter != null ||
    line.contact_lens_left_power != null ||
    line.contact_lens_left_qty != null ||
    line.contact_lens_left_cylinder != null ||
    line.contact_lens_left_axis != null ||
    line.contact_lens_right_base_curve != null ||
    line.contact_lens_right_diameter != null ||
    line.contact_lens_right_power != null ||
    line.contact_lens_right_qty != null ||
    line.contact_lens_right_cylinder != null ||
    line.contact_lens_right_axis != null;

  const pd = line.prescription_data as Record<string, unknown> | null | undefined;
  const hasRx =
    pd &&
    typeof pd === 'object' &&
    (Boolean(pd.pd) ||
      Boolean(pd.rightEye) ||
      Boolean(pd.leftEye));

  const rows: React.ReactNode[] = [];

  if (frameName) {
    rows.push(
      <SelectionRow key="frame" label="Frame color">
        {frameCode && (
          <span
            className="inline-block w-4 h-4 rounded-full border border-gray-300 shrink-0"
            style={{ backgroundColor: frameCode || '#ccc' }}
            title={frameName}
          />
        )}
        <span>{frameName}</span>
      </SelectionRow>
    );
  }

  if (lensTint?.name) {
    rows.push(
      <SelectionRow key="tint" label="Lens tint">
        {lensTint.color_code && (
          <span
            className="inline-block w-4 h-4 rounded-full border border-gray-300 shrink-0"
            style={{ backgroundColor: lensTint.color_code || '#ccc' }}
            title={lensTint.name}
          />
        )}
        <span>{lensTint.name}</span>
      </SelectionRow>
    );
  } else if (line.lens_color_id != null) {
    rows.push(
      <SelectionRow key="tint-id" label="Lens tint">
        <span>Option #{line.lens_color_id}</span>
      </SelectionRow>
    );
  }

  const eyeOpt = pv?.eye_hygiene;
  if (eyeOpt?.label) {
    rows.push(
      <SelectionRow key="eye-hygiene" label="Eye hygiene option">
        <span>{eyeOpt.label}</span>
      </SelectionRow>
    );
  }

  if (line.lens_type) {
    rows.push(
      <SelectionRow key="lens-type" label="Lens type">
        <span>{line.lens_type}</span>
      </SelectionRow>
    );
  }

  if (line.lens_index != null && line.lens_index !== '') {
    rows.push(
      <SelectionRow key="lens-index" label="Lens index">
        <span>{String(line.lens_index)}</span>
      </SelectionRow>
    );
  }

  if (line.frame_size_id) {
    rows.push(
      <SelectionRow key="frame-size" label="Frame size">
        <span>#{line.frame_size_id}</span>
      </SelectionRow>
    );
  }

  if (line.lens_thickness_material_id || line.lens_thickness_option_id) {
    const parts = [
      line.lens_thickness_material_id && `Material #${line.lens_thickness_material_id}`,
      line.lens_thickness_option_id && `Thickness #${line.lens_thickness_option_id}`,
    ].filter(Boolean);
    rows.push(
      <SelectionRow key="thickness" label="Lens thickness">
        <span>{parts.join(' · ')}</span>
      </SelectionRow>
    );
  }

  if (line.treatment_ids && line.treatment_ids.length > 0) {
    rows.push(
      <SelectionRow key="treatments" label="Treatments">
        <span>{line.treatment_ids.join(', ')}</span>
      </SelectionRow>
    );
  }

  if (line.lens_coatings) {
    rows.push(
      <SelectionRow key="coatings" label="Coatings">
        <span>{line.lens_coatings}</span>
      </SelectionRow>
    );
  }

  if (line.progressive_variant_id) {
    rows.push(
      <SelectionRow key="prog" label="Progressive">
        <span>#{line.progressive_variant_id}</span>
      </SelectionRow>
    );
  }

  if (line.photochromic_color_id) {
    rows.push(
      <SelectionRow key="photo" label="Photochromic">
        <span>#{line.photochromic_color_id}</span>
      </SelectionRow>
    );
  }

  if (line.prescription_sun_color_id) {
    rows.push(
      <SelectionRow key="sun" label="Sun lens color">
        <span>#{line.prescription_sun_color_id}</span>
      </SelectionRow>
    );
  }

  if (hasRx && pd) {
    const re = pd.rightEye as Record<string, string> | undefined;
    const le = pd.leftEye as Record<string, string> | undefined;
    const bits: string[] = [];
    if (pd.pd) bits.push(`PD ${pd.pd}`);
    if (re?.sph) bits.push(`R SPH ${re.sph}`);
    if (le?.sph) bits.push(`L SPH ${le.sph}`);
    rows.push(
      <SelectionRow key="rx" label="Prescription">
        <span className="break-words">{bits.length ? bits.join(' · ') : 'Provided'}</span>
      </SelectionRow>
    );
  }

  if (line.lens_configuration && Object.keys(line.lens_configuration).length > 0) {
    rows.push(
      <SelectionRow key="lens-cfg" label="Lens options">
        <span className="break-all opacity-90">
          {JSON.stringify(line.lens_configuration)}
        </span>
      </SelectionRow>
    );
  }

  if (hasContact) {
    if (line.contact_lens_pack_quantity != null) {
      rows.push(
        <SelectionRow key="cl-pack" label="Pack size">
          <span>×{line.contact_lens_pack_quantity} lenses per box</span>
        </SelectionRow>
      );
    }
    const colourLabel =
      line.variant?.color_name ??
      (line.product_variant as { color_name?: string } | undefined)?.color_name;
    if (colourLabel) {
      rows.push(
        <SelectionRow key="cl-colour" label="Lens colour">
          <span>{colourLabel}</span>
        </SelectionRow>
      );
    }
    const L = (
      side: string,
      curve?: number | null,
      dia?: number | null,
      pow?: number | null,
      qty?: number | null,
      cyl?: number | null,
      axis?: number | null
    ) => {
      const hasEye =
        curve != null ||
        dia != null ||
        pow != null ||
        qty != null ||
        cyl != null ||
        axis != null;
      if (!hasEye) return null;
      const parts: string[] = [`BC ${curve ?? '—'}`, `Ø ${dia ?? '—'}`];
      if (pow != null || qty != null) {
        parts.push(`PWR ${pow ?? '—'}`);
        if (qty != null) parts.push(`×${qty}`);
      }
      if (cyl != null) {
        parts.push(`cyl ${cyl}`, `axis ${axis ?? '—'}`);
      } else if (axis != null) {
        parts.push(`axis ${axis}`);
      }
      return `${side}: ${parts.join(' · ')}`;
    };
    const left = L(
      'L',
      line.contact_lens_left_base_curve,
      line.contact_lens_left_diameter,
      line.contact_lens_left_power,
      line.contact_lens_left_qty,
      line.contact_lens_left_cylinder,
      line.contact_lens_left_axis
    );
    const right = L(
      'R',
      line.contact_lens_right_base_curve,
      line.contact_lens_right_diameter,
      line.contact_lens_right_power,
      line.contact_lens_right_qty,
      line.contact_lens_right_cylinder,
      line.contact_lens_right_axis
    );
    if (left || right) {
      rows.push(
        <SelectionRow key="cl" label="Contact lenses">
          <span className="flex flex-col gap-0.5">
            {left && <span>{left}</span>}
            {right && <span>{right}</span>}
          </span>
        </SelectionRow>
      );
    }
  }

  if (rows.length === 0) return null;

  return <div className={`space-y-0.5 ${className}`.trim()}>{rows}</div>;
}
