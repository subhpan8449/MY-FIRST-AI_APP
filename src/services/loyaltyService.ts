import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { LoyaltyTier, LoyaltyTransaction, LoyaltyRewardOption } from '../types';

export interface LoyaltyTierInfo {
  tier: LoyaltyTier;
  name: string;
  minPoints: number;
  pointsRate: number; // e.g. 10 points per ₹100
  badgeColor: string;
  perks: string[];
}

export const LOYALTY_TIERS: Record<LoyaltyTier, LoyaltyTierInfo> = {
  explorer: {
    tier: 'explorer',
    name: 'Sunlit Explorer',
    minPoints: 0,
    pointsRate: 10, // 10 pts per ₹100
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    perks: [
      'Earn 10 points per ₹100 on every direct room booking',
      'Complimentary swimming pool & children play area privileges',
      'Exclusive member promo codes & seasonal offers'
    ]
  },
  pioneer: {
    tier: 'pioneer',
    name: 'Ganga Pioneer',
    minPoints: 500,
    pointsRate: 12, // 12 pts per ₹100
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    perks: [
      'Earn 12 points per ₹100 on every stay (20% bonus)',
      'Complimentary 1-hour late checkout (subject to availability)',
      'Priority swimming pool & rooftop sunset slot reservation',
      'Dedicated host assistance via direct WhatsApp hotline'
    ]
  },
  patron: {
    tier: 'patron',
    name: 'Himalayan Patron',
    minPoints: 1500,
    pointsRate: 15, // 15 pts per ₹100
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    perks: [
      'Earn 15 points per ₹100 on every stay (50% bonus)',
      'Complimentary welcome Ayurvedic herbal tea & local dry fruit hamper',
      '1 Free celebratory rooftop sunset tea experience per stay',
      'Free room upgrade upon availability on check-in day',
      'Zero cancellation charge window extended up to 24 hours'
    ]
  }
};

export const LOYALTY_REWARD_OPTIONS: LoyaltyRewardOption[] = [
  {
    id: 'rew_50',
    name: '₹50 Stay Discount',
    pointsRequired: 100,
    discountValue: 50,
    description: 'Instant ₹50 deduction on your room total',
    badge: 'Popular'
  },
  {
    id: 'rew_100',
    name: '₹100 Stay Discount',
    pointsRequired: 200,
    discountValue: 100,
    description: 'Instant ₹100 deduction on your room total'
  },
  {
    id: 'rew_250',
    name: '₹250 Stay Discount',
    pointsRequired: 500,
    discountValue: 250,
    description: 'Instant ₹250 deduction on your room total',
    badge: 'Best Value'
  },
  {
    id: 'rew_500',
    name: '₹500 Premium Discount',
    pointsRequired: 1000,
    discountValue: 500,
    description: 'Instant ₹500 deduction on long stays or suites'
  }
];

export function getTierForPoints(points: number): LoyaltyTier {
  if (points >= 1500) return 'patron';
  if (points >= 500) return 'pioneer';
  return 'explorer';
}

export function calculatePointsToEarn(totalAmount: number, tier: LoyaltyTier = 'explorer'): number {
  const rate = LOYALTY_TIERS[tier]?.pointsRate || 10;
  return Math.floor((totalAmount / 100) * rate);
}

export interface UserLoyaltySummary {
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  tierInfo: LoyaltyTierInfo;
  nextTierPointsNeeded: number;
  transactions: LoyaltyTransaction[];
}

export async function getUserLoyaltySummary(userId: string): Promise<UserLoyaltySummary> {
  let points = 0;
  let lifetimePoints = 0;
  let tier: LoyaltyTier = 'explorer';

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      points = data.loyaltyPoints ?? 150; // Starter welcome points for registered guests
      lifetimePoints = data.lifetimeLoyaltyPoints ?? points;
      tier = data.loyaltyTier || getTierForPoints(points);
    }
  } catch (err) {
    console.warn('Error reading loyalty profile:', err);
    points = 150;
  }

  // Get transactions
  let transactions: LoyaltyTransaction[] = [];
  try {
    const q = query(
      collection(db, 'loyaltyTransactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    const snap = await getDocs(q);
    transactions = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  } catch (err) {
    // Fallback if index not ready
    try {
      const q = query(collection(db, 'loyaltyTransactions'), where('userId', '==', userId));
      const snap = await getDocs(q);
      transactions = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as any) }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (e) {
      console.warn('Error reading loyalty transactions:', e);
    }
  }

  // Default welcome bonus entry if empty
  if (transactions.length === 0 && points > 0) {
    transactions = [
      {
        id: 'tx_welcome',
        userId,
        type: 'bonus',
        points,
        description: 'Welcome to Sunlit Rewards Club! Registration bonus points credited.',
        timestamp: new Date().toISOString()
      }
    ];
  }

  const calculatedTier = getTierForPoints(points);
  const nextTarget = calculatedTier === 'explorer' ? 500 : calculatedTier === 'pioneer' ? 1500 : 1500;
  const needed = Math.max(0, nextTarget - points);

  return {
    points,
    lifetimePoints,
    tier: calculatedTier,
    tierInfo: LOYALTY_TIERS[calculatedTier],
    nextTierPointsNeeded: needed,
    transactions
  };
}

export async function redeemPointsForBooking(
  userId: string,
  pointsToRedeem: number,
  discountAmount: number,
  bookingRef: string
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentPoints = userDoc.exists() ? (userDoc.data().loyaltyPoints || 0) : 0;

    if (currentPoints < pointsToRedeem) {
      throw new Error('Insufficient loyalty points.');
    }

    const newPoints = currentPoints - pointsToRedeem;
    await updateDoc(userRef, {
      loyaltyPoints: newPoints,
      loyaltyTier: getTierForPoints(newPoints),
      updatedAt: new Date().toISOString()
    });

    // Record transaction
    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: 'redeemed',
      points: -pointsToRedeem,
      description: `Redeemed ${pointsToRedeem} points for ₹${discountAmount} discount on stay ${bookingRef}`,
      bookingReference: bookingRef,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (err: any) {
    console.error('Error redeeming loyalty points:', err);
    return false;
  }
}

export async function awardPointsForBooking(
  userId: string,
  totalAmount: number,
  bookingRef: string
): Promise<number> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentPoints = userDoc.exists() ? (userDoc.data().loyaltyPoints || 0) : 0;
    const currentLifetime = userDoc.exists() ? (userDoc.data().lifetimeLoyaltyPoints || currentPoints) : 0;
    const currentTier = userDoc.exists() ? (userDoc.data().loyaltyTier || 'explorer') : 'explorer';

    const pointsToEarn = calculatePointsToEarn(totalAmount, currentTier as LoyaltyTier);
    const newPoints = currentPoints + pointsToEarn;
    const newLifetime = currentLifetime + pointsToEarn;
    const newTier = getTierForPoints(newPoints);

    await updateDoc(userRef, {
      loyaltyPoints: newPoints,
      lifetimeLoyaltyPoints: newLifetime,
      loyaltyTier: newTier,
      updatedAt: new Date().toISOString()
    });

    // Record transaction
    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: 'earned',
      points: pointsToEarn,
      description: `Earned ${pointsToEarn} Sunlit points for stay reservation ${bookingRef}`,
      bookingReference: bookingRef,
      timestamp: new Date().toISOString()
    });

    return pointsToEarn;
  } catch (err: any) {
    console.error('Error awarding loyalty points:', err);
    return 0;
  }
}

export async function adminAdjustPoints(
  userId: string,
  pointsAdjustment: number,
  reason: string,
  adminEmail: string
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentPoints = userDoc.exists() ? (userDoc.data().loyaltyPoints || 0) : 0;
    const newPoints = Math.max(0, currentPoints + pointsAdjustment);

    await updateDoc(userRef, {
      loyaltyPoints: newPoints,
      loyaltyTier: getTierForPoints(newPoints),
      updatedAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: pointsAdjustment >= 0 ? 'bonus' : 'adjustment',
      points: pointsAdjustment,
      description: `Admin Adjustment (${adminEmail}): ${reason}`,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (err: any) {
    console.error('Error adjusting points:', err);
    return false;
  }
}
