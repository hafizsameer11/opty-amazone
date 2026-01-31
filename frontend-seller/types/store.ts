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
  onboarding_status: string;
  onboarding_level: number;
  onboarding_percent: number;
  meta?: any;
  created_at: string;
  updated_at: string;
}

export interface StoreSocialLink {
  id: number;
  store_id: number;
  platform: 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'website' | 'other';
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreUser {
  id: number;
  store_id: number;
  user: any;
  role: 'owner' | 'manager' | 'staff';
  permissions: string[];
  is_active: boolean;
  invited_by?: number;
  invited_at?: string;
  joined_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StoreStatistic {
  id: number;
  store_id: number;
  total_views: number;
  total_clicks: number;
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_followers: number;
  total_reviews: number;
  average_rating: number;
  last_calculated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateStoreData {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
}

export interface CreateSocialLinkData {
  platform: StoreSocialLink['platform'];
  url: string;
  is_active?: boolean;
}

export interface InviteUserData {
  email: string;
  role?: 'owner' | 'manager' | 'staff';
  permissions?: string[];
}
