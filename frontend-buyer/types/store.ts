export interface Store {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  profile_image?: string;
  profile_image_url?: string;
  banner_image?: string;
  banner_image_url?: string;
  theme_color: string;
  phone_visibility: 'public' | 'request' | 'hidden';
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreReview {
  id: number;
  store_id: number;
  user: any;
  rating: number;
  comment?: string;
  is_verified_purchase: boolean;
  seller_reply?: string;
  seller_replied_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewData {
  rating: number;
  comment?: string;
  is_verified_purchase?: boolean;
}
