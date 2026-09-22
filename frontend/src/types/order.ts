export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderCustomDetails {
  day?: number;
  rotiCount?: number;
  sabziBoxes?: number;
  sabziBreakdown?: Record<string, number>;
  selectedSabzi?: string;
  sabziSet1?: string;
  sabziSet2?: string;
  extraRaita?: boolean;
  extraSweet?: boolean;
  deliveryDays?: string[];
  basePlan?: string;
  [key: string]: unknown;
}

export interface Order {
  orderId: string;
  userId: string;
  items: OrderItem[];
  price: number;
  status: 'Confirmed' | 'Cooking' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  deliveryDate: string;
  deliveryAddress?: string;
  city?: string;
  createdAt: string;
  paymentStatus: string;
  paymentMethod?: string;
  orderType?: string;
  plan?: string;
  customerName?: string;
  customerPhone?: string;
  customDetails?: OrderCustomDetails | null;
  notes?: string | null;
  deliveryFee?: number;
  couponCode?: string | null;
}
