export type AppRole = 'customer' | 'operator' | 'admin';
export type BookingStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'confirmed'
  | 'cancelled'
  | 'expired';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type GalleryStatus = 'pending' | 'approved' | 'rejected';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

export type Profile = {
  id: string;
  username: string | null;
  full_name: string;
  phone: string | null;
  avatar_path: string | null;
  role: AppRole;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
};

export type RemoteEvent = {
  id: string;
  slug: string;
  title: string;
  label: string;
  description: string;
  starts_at: string;
  ends_at: string;
  fish_kg: number;
  price: number;
  total_spots: number;
  image_path: string | null;
  status: EventStatus;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

export type RemoteNewsItem = {
  id: string;
  event_id: string | null;
  slug: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  image_path: string | null;
  published_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueSettings = {
  id: boolean;
  venue_name: string;
  opens_at: string;
  closes_at: string;
  fish_mood: string;
  fish_mood_note: string;
  map_url: string;
  whatsapp: string | null;
  natural_bait_rule: string;
  updated_by: string | null;
  updated_at: string;
};

export type Booking = {
  id: string;
  booking_code: string;
  event_id: string;
  user_id: string;
  spot_number: number;
  participant_name: string;
  participant_phone: string;
  notes: string | null;
  agreed_to_rules_at: string;
  amount: number;
  status: BookingStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateBookingResult = {
  booking_id: string;
  booking_code: string;
  amount: number;
  status: BookingStatus;
  expires_at: string;
};
