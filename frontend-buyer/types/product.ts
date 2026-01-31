// Product types for optical marketplace

export type ProductType = "frame" | "sunglasses" | "contact_lens" | "eye_hygiene" | "accessory";
export type StockStatus = "in_stock" | "out_of_stock" | "backorder";
export type Gender = "men" | "women" | "unisex" | "kids";

export interface FrameSize {
  id: number;
  size_label: string;
  lens_width: number;
  bridge_width: number;
  temple_length: number;
  frame_width: number;
  frame_height: number;
  stock_quantity: number;
}

export interface LensType {
  id: number;
  name: string;
  price: number;
}

export interface LensIndex {
  id: number;
  index: string;
  description: string;
  price: number;
}

export interface LensTreatment {
  id: number;
  name: string;
  price: number;
}

export interface ContactLensPower {
  id: number;
  sphere: string;
  cylinder?: string;
  axis?: number;
  base_curve: string;
  diameter: string;
  stock_quantity: number;
}

export interface Seller {
  id: number;
  name: string;
  rating: number;
  total_products: number;
}

export interface RelatedProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  rating: number;
}

// Base product interface
export interface BaseProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  product_type: ProductType;
  category: string;
  sub_category?: string;
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  stock_status: StockStatus;
  images: string[];
  short_description: string;
  description: string;
  rating: number;
  review_count: number;
  view_count: number;
  seller: Seller;
  free_shipping: boolean;
  estimated_delivery: string;
  related_products?: RelatedProduct[];
}

// Frame/Sunglasses specific
export interface FrameProduct extends BaseProduct {
  product_type: "frame" | "sunglasses";
  frame_shape: string;
  frame_material: string;
  frame_color: string;
  frame_colors: string[];
  gender: Gender;
  frame_sizes: FrameSize[];
  lens_types: LensType[];
  lens_index_options: LensIndex[];
  treatment_options: LensTreatment[];
  uv_protection?: boolean; // For sunglasses
  polarization?: boolean; // For sunglasses
  uv_protection_level?: string; // e.g., "UV400"
}

// Contact Lens specific
export interface ContactLensProduct extends BaseProduct {
  product_type: "contact_lens";
  contact_lens_brand: string;
  contact_lens_type: string; // e.g., "daily", "monthly", "yearly"
  contact_lens_material: string;
  contact_lens_color?: string;
  replacement_frequency: string;
  base_curve_options: string[];
  diameter_options: string[];
  powers_range: ContactLensPower[];
  water_content?: string;
  has_uv_filter: boolean;
  can_sleep_with: boolean;
  is_medical_device: boolean;
  expiry_date?: string;
  pack_type?: string;
  size_volume?: string;
}

// Eye Hygiene specific
export interface EyeHygieneProduct extends BaseProduct {
  product_type: "eye_hygiene";
  size_volume: string;
  pack_type: string;
  expiry_date?: string;
}

// Accessory specific
export interface AccessoryProduct extends BaseProduct {
  product_type: "accessory";
  accessory_type: string; // e.g., "case", "cleaning_cloth", "chain"
  compatible_with?: string[]; // Product types this accessory works with
}

export type Product = FrameProduct | ContactLensProduct | EyeHygieneProduct | AccessoryProduct;
