export interface PriceCalculationResult {
  success: boolean;
  nights: number;
  ratePerNight: number;
  roomSubtotal: number;
  discountAmount: number;
  appliedPromo?: {
    code: string;
    name: string;
    discount: number;
  } | null;
  finalTotal: number;
  includesPoolAndPlayArea: boolean;
}

export interface PaymentConfig {
  available: boolean;
  keyId: string | null;
  testMode?: boolean;
  gatewayPending?: boolean;
  allowPayAtProperty: boolean;
  notice?: string;
}

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  isSimulated?: boolean;
  gatewayPending?: boolean;
  allowPayAtProperty?: boolean;
  message?: string;
  note?: string;
}

export async function calculateServerPrice(params: {
  basePrice: number;
  checkInDate: string;
  checkOutDate: string;
  promoCode?: string;
}): Promise<PriceCalculationResult> {
  const res = await fetch('/api/pricing/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to calculate price');
  }

  return res.json();
}

export async function createInventoryHold(params: {
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  userId: string;
}): Promise<{ holdId: string; expiresAt: number; expiresInMinutes: number }> {
  const res = await fetch('/api/bookings/hold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Room is unavailable or currently held by another guest');
  }

  return res.json();
}

export async function releaseInventoryHold(holdId: string): Promise<void> {
  try {
    await fetch('/api/bookings/release-hold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdId })
    });
  } catch (err) {
    console.warn('Hold release error:', err);
  }
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const res = await fetch('/api/payment/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch payment config:', err);
  }
  return { available: false, keyId: null, testMode: true, allowPayAtProperty: true };
}

export async function createRazorpayOrder(params: {
  amount: number;
  bookingReference: string;
  guestEmail: string;
  guestPhone: string;
}): Promise<CreateOrderResult> {
  const res = await fetch('/api/payment/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create payment order');
  }

  return res.json();
}

export async function verifyRazorpayPayment(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<{ success: boolean; verified: boolean; simulated?: boolean }> {
  const res = await fetch('/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Payment signature verification failed');
  }

  return res.json();
}
