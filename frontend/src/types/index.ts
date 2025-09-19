export interface User {
  user_id: number;
  name: string;
  email: string;
}

export interface Event {
  event_id: number;
  user_id: number;
  name: string;
  description?: string;
  venue?: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  CouponRates?: CouponRate[];
  MealChoices?: MealChoice[];
  Participants?: Participant[];
  stats?: {
    totalCoupons: number;
    redeemedCoupons: number;
    totalAmount: number;
    redeemedAmount: number;
    totalParticipants: number;
  };
}

export interface CouponRate {
  rate_id: number;
  event_id: number;
  rate_type: 'Member' | 'Guest';
  price: number;
}

export interface MealChoice {
  meal_id: number;
  event_id: number;
  meal_type: string;
}

export interface Participant {
  participant_id: number;
  event_id: number;
  name: string;
  address?: string;
  contact_number?: string;
  Coupons?: Coupon[];
}

export interface Coupon {
  coupon_id: number;
  participant_id: number;
  event_id: number;
  rate_id: number;
  meal_id: number;
  qr_code_value: string;
  qr_code_link?: string;
  status: 'Booked' | 'Consumed' | 'Partial';
  consumed_count: number;
  total_count: number;
  created_at: string;
  updated_at: string;
  Event?: Event;
  Participant?: Participant;
  CouponRate?: CouponRate;
  MealChoice?: MealChoice;
}

export interface Redemption {
  redemption_id: number;
  coupon_id: number;
  redeemed_count: number;
  redeemed_at: string;
  redeemed_by?: number;
  Coupon?: Coupon;
}

export interface EventSummary {
  event: {
    name: string;
    venue?: string;
    start_date: string;
    end_date: string;
  };
  summary: {
    total_participants: number;
    total_coupons_booked: number;
    total_coupons_redeemed: number;
    pending_coupons: number;
    breakdown: any[];
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}