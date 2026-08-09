export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  orderId: string;
  userId: string;
  items: OrderItem[];
  price: number;
  status: 'Confirmed' | 'Cooking' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  deliveryDate: string;
  deliveryAddress?: string;
  createdAt: string;
  paymentStatus: string;
  paymentMethod?: string;
  orderType?: string;
  plan?: string;
  customerName?: string;
  customerPhone?: string;
}
