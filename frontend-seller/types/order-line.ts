/**
 * Fields persisted on cart lines and copied to order_items — used to render selections everywhere.
 */
export interface OrderLineSelections {
  variant_id?: number | null;
  variant?: {
    id?: number;
    color_name?: string;
    color_code?: string;
    images?: string[];
  } | null;
  lens_color_id?: number | null;
  product_variant?: {
    color_name?: string;
    color_code?: string;
    lens_color_id?: number;
    lens_color?: {
      id?: number;
      name?: string;
      color_code?: string;
      description?: string;
    };
    eye_hygiene?: {
      variant_type?: string;
      label?: string;
      image_url?: string | null;
      product_size_volume_id?: number;
      eye_hygiene_variant_id?: number;
    };
    [key: string]: unknown;
  } | null;
  lens_configuration?: Record<string, unknown> | null;
  prescription_data?: Record<string, unknown> | null;
  frame_size_id?: number | null;
  prescription_id?: number | null;
  lens_index?: number | string | null;
  lens_type?: string | null;
  lens_thickness_material_id?: number | null;
  lens_thickness_option_id?: number | null;
  treatment_ids?: number[] | null;
  lens_coatings?: string | null;
  progressive_variant_id?: number | null;
  photochromic_color_id?: number | null;
  prescription_sun_color_id?: number | null;
  contact_lens_left_base_curve?: number | null;
  contact_lens_left_diameter?: number | null;
  contact_lens_left_power?: number | null;
  contact_lens_left_qty?: number | null;
  contact_lens_left_cylinder?: number | null;
  contact_lens_left_axis?: number | null;
  contact_lens_right_base_curve?: number | null;
  contact_lens_right_diameter?: number | null;
  contact_lens_right_power?: number | null;
  contact_lens_right_qty?: number | null;
  contact_lens_right_cylinder?: number | null;
  contact_lens_right_axis?: number | null;
  contact_lens_pack_quantity?: number | null;
  product_size_volume_id?: number | null;
  eye_hygiene_variant_id?: number | null;
}
