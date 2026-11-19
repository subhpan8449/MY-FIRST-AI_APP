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

export const DEFAULT_WELCOME_POINTS = 150;
export const POINTS_TO_RUPEE_RATE = 0.5; // 2 Sunlit Points = ₹1 instant booking discount

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
      'All Play & Earn Arcade game points auto-added to your loyalty wallet',
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
      'Arcade game points count toward lifetime tier & stay discounts',
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
    id: 'rew_25',
    name: '₹25 Quick Discount',
    pointsRequired: 50,
    discountValue: 25,
    description: 'Spend 50 game or stay points for ₹25 instant off',
    badge: 'Arcade Starter'
  },
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
  return Math.floor((Math.max(0, totalAmount) / 100) * rate);
}

/**
 * Computes the maximum usable points and corresponding ₹ discount
 * at 2 points = ₹1 (rounded down to whole ₹, capped at order subtotal).
 */
export function calculateMaxLoyaltyRedemption(
  availablePoints: number,
  maxOrderTotal: number
): { pointsToUse: number; discountRupees: number } {
  const safePoints = Math.max(0, Math.floor(Number(availablePoints) || 0));
  const safeOrder = Math.max(0, Math.floor(Number(maxOrderTotal) || 0));
  if (safePoints < 20 || safeOrder <= 0) {
    return { pointsToUse: 0, discountRupees: 0 };
  }
  const maxDiscountFromPoints = Math.floor(safePoints * POINTS_TO_RUPEE_RATE);
  const discountRupees = Math.min(maxDiscountFromPoints, safeOrder);
  const pointsToUse = Math.min(safePoints, Math.ceil(discountRupees / POINTS_TO_RUPEE_RATE));
  return { pointsToUse, discountRupees };
}

export interface UserLoyaltySummary {
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  tierInfo: LoyaltyTierInfo;
  nextTierPointsNeeded: number;
  transactions: LoyaltyTransaction[];
  gamePointsTotal?: number;
}

/**
 * One-time idempotent migration: if a user earned points in the legacy separate
 * gameProgress wallet before unification, transfer them into users/{uid}.loyaltyPoints
 * so they are immediately available for booking discounts.
 */
export async function syncLegacyGamePointsToLoyalty(userId: string): Promise<number> {
  if (!userId) return 0;
  try {
    const gameRef = doc(db, 'gameProgress', userId);
    const gameSnap = await getDoc(gameRef);
    if (!gameSnap.exists()) return 0;

    const gData = gameSnap.data();
    if (gData.migratedToLoyalty === true) return 0;

    const legacyBalance = Math.max(0, Math.floor(Number(gData.pointsBalance ?? gData.totalTokensCollected ?? 0)));
    if (legacyBalance <= 0) {
      await setDoc(gameRef, { userId, migratedToLoyalty: true }, { merge: true });
      return 0;
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const currentPoints = userSnap.exists() ? (userSnap.data().loyaltyPoints ?? DEFAULT_WELCOME_POINTS) : DEFAULT_WELCOME_POINTS;
    const currentLifetime = userSnap.exists() ? (userSnap.data().lifetimeLoyaltyPoints ?? currentPoints) : currentPoints;
    const newPoints = currentPoints + legacyBalance;
    const newLifetime = currentLifetime + legacyBalance;
    const newTier = getTierForPoints(newLifetime);

    await setDoc(
      userRef,
      {
        uid: userId,
        loyaltyPoints: newPoints,
        lifetimeLoyaltyPoints: newLifetime,
        loyaltyTier: newTier,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    await setDoc(
      gameRef,
      {
        userId,
        pointsBalance: newPoints,
        migratedToLoyalty: true,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );

    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: 'bonus',
      points: legacyBalance,
      description: `Synced +${legacyBalance} Sunlit Arcade game points into your Sunlit Rewards Loyalty Wallet`,
      timestamp: new Date().toISOString()
    });

    return legacyBalance;
  } catch (err) {
    console.warn('Legacy game points migration notice:', err);
    return 0;
  }
}

export async function getUserLoyaltySummary(userId: string): Promise<UserLoyaltySummary> {
  let points = DEFAULT_WELCOME_POINTS;
  let lifetimePoints = DEFAULT_WELCOME_POINTS;

  // Ensure any pre-existing separate game balance is seamlessly merged once
  await syncLegacyGamePointsToLoyalty(userId);

  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      points = typeof data.loyaltyPoints === 'number' ? data.loyaltyPoints : DEFAULT_WELCOME_POINTS;
      lifetimePoints = typeof data.lifetimeLoyaltyPoints === 'number'
        ? Math.max(data.lifetimeLoyaltyPoints, points)
        : points;
    }
  } catch (err) {
    console.warn('Error reading loyalty profile:', err);
    points = DEFAULT_WELCOME_POINTS;
    lifetimePoints = DEFAULT_WELCOME_POINTS;
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
  } catch {
    // Fallback if composite index not ready
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

  const gamePointsTotal = transactions
    .filter(tx => tx.points > 0 && /arcade|game|ganga rapids|sky runner|sanctuary match|trivia/i.test(tx.description || ''))
    .reduce((sum, tx) => sum + tx.points, 0);

  const calculatedTier = getTierForPoints(lifetimePoints);
  const nextTarget = calculatedTier === 'explorer' ? 500 : calculatedTier === 'pioneer' ? 1500 : 1500;
  const needed = Math.max(0, nextTarget - lifetimePoints);

  return {
    points,
    lifetimePoints,
    tier: calculatedTier,
    tierInfo: LOYALTY_TIERS[calculatedTier],
    nextTierPointsNeeded: needed,
    transactions,
    gamePointsTotal
  };
}

/**
 * Credits Sunlit Play & Earn game points DIRECTLY into the customer's unified
 * Sunlit Rewards loyalty balance (`users/{uid}.loyaltyPoints`) + `loyaltyTransactions`
 * AND keeps `gameProgress/{uid}` synced for daily cap / high scores.
 */
export async function awardGamePointsToLoyalty(params: {
  userId: string;
  pointsAwarded: number;
  gameName: string;
  tokensCollected: number;
  dailyTotal?: number;
  score?: number;
}): Promise<{ success: boolean; newBalance: number; newLifetime: number; newTier: LoyaltyTier }> {
  const { userId, pointsAwarded, gameName, tokensCollected, dailyTotal, score } = params;
  const safeAward = Math.max(0, Math.floor(Number(pointsAwarded) || 0));

  try {
    const userRef = doc(db, 'users', userId);
    const gameRef = doc(db, 'gameProgress', userId);
    const [userSnap, gameSnap] = await Promise.all([getDoc(userRef), getDoc(gameRef)]);

    const currentPoints = userSnap.exists() && typeof userSnap.data().loyaltyPoints === 'number'
      ? userSnap.data().loyaltyPoints
      : DEFAULT_WELCOME_POINTS;
    const currentLifetime = userSnap.exists() && typeof userSnap.data().lifetimeLoyaltyPoints === 'number'
      ? Math.max(userSnap.data().lifetimeLoyaltyPoints, currentPoints)
      : currentPoints;

    const newPoints = currentPoints + safeAward;
    const newLifetime = currentLifetime + safeAward;
    const newTier = getTierForPoints(newLifetime);
    const nowIso = new Date().toISOString();
    const todayStr = nowIso.slice(0, 10);

    await setDoc(
      userRef,
      {
        uid: userId,
        loyaltyPoints: newPoints,
        lifetimeLoyaltyPoints: newLifetime,
        loyaltyTier: newTier,
        updatedAt: nowIso
      },
      { merge: true }
    );

    const prevGame = gameSnap.exists() ? gameSnap.data() : {};
    const prevDate = prevGame.lastPlayedDate || '';
    const prevDaily = prevDate === todayStr ? Number(prevGame.dailyPointsEarned || 0) : 0;
    const nextDaily = typeof dailyTotal === 'number' ? Math.max(prevDaily + safeAward, dailyTotal) : prevDaily + safeAward;
    const nextHighScore = Math.max(Number(prevGame.highScore || 0), Number(score || tokensCollected || 0));

    await setDoc(
      gameRef,
      {
        userId,
        highScore: nextHighScore,
        level: Math.max(1, Math.floor(newLifetime / 250) + 1),
        totalTokensCollected: Number(prevGame.totalTokensCollected || 0) + Math.max(0, Math.round(tokensCollected)),
        pointsEarnedToday: nextDaily,
        dailyPointsEarned: nextDaily,
        pointsBalance: newPoints,
        lastPlayedDate: todayStr,
        quizzesCompleted: Number(prevGame.quizzesCompleted || 0) + (gameName.toLowerCase().includes('trivia') ? 1 : 0),
        migratedToLoyalty: true,
        updatedAt: nowIso
      },
      { merge: true }
    );

    if (safeAward > 0) {
      await addDoc(collection(db, 'loyaltyTransactions'), {
        userId,
        type: 'earned',
        points: safeAward,
        description: `Sunlit Arcade (${gameName}): Earned +${safeAward} Sunlit Rewards points`,
        timestamp: nowIso
      });
    }

    return {
      success: true,
      newBalance: newPoints,
      newLifetime,
      newTier
    };
  } catch (err) {
    console.error('awardGamePointsToLoyalty error:', err);
    return {
      success: false,
      newBalance: 0,
      newLifetime: 0,
      newTier: 'explorer'
    };
  }
}

/**
 * Redeems points from the unified Sunlit Rewards wallet to mint a persistent
 * Firestore `gameVouchers` discount code usable in BookingModal.
 */
export async function redeemLoyaltyPointsForVoucher(params: {
  userId: string;
  userEmail: string;
  pointsCost: number;
  discountAmount: number;
  voucherCode: string;
  rewardName: string;
  minBookingAmount: number;
}): Promise<{ success: boolean; newBalance: number; voucherId?: string; error?: string }> {
  const { userId, userEmail, pointsCost, discountAmount, voucherCode, rewardName, minBookingAmount } = params;
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const currentPoints = userSnap.exists() && typeof userSnap.data().loyaltyPoints === 'number'
      ? userSnap.data().loyaltyPoints
      : DEFAULT_WELCOME_POINTS;
    const currentLifetime = userSnap.exists() && typeof userSnap.data().lifetimeLoyaltyPoints === 'number'
      ? Math.max(userSnap.data().lifetimeLoyaltyPoints, currentPoints)
      : currentPoints;

    if (currentPoints < pointsCost) {
      return {
        success: false,
        newBalance: currentPoints,
        error: `Insufficient Sunlit Points. You have ${currentPoints} pts and need ${pointsCost} pts.`
      };
    }

    const newPoints = currentPoints - pointsCost;
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days validity

    await setDoc(
      userRef,
      {
        uid: userId,
        loyaltyPoints: newPoints,
        lifetimeLoyaltyPoints: currentLifetime,
        loyaltyTier: getTierForPoints(currentLifetime),
        updatedAt: nowIso
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'gameProgress', userId),
      {
        userId,
        pointsBalance: newPoints,
        migratedToLoyalty: true,
        updatedAt: nowIso
      },
      { merge: true }
    );

    const voucherRef = await addDoc(collection(db, 'gameVouchers'), {
      code: voucherCode,
      voucherCode,
      userId,
      userEmail: userEmail || '',
      rewardTierId: `arcade_${discountAmount}`,
      rewardName,
      discountAmount,
      minBookingAmount,
      status: 'active',
      isUsed: false,
      createdAt: nowIso,
      expiresAt: expiresIso
    });

    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: 'redeemed',
      points: -pointsCost,
      description: `Redeemed ${pointsCost} Sunlit Points for ₹${discountAmount} Voucher (${voucherCode})`,
      timestamp: nowIso
    });

    return {
      success: true,
      newBalance: newPoints,
      voucherId: voucherRef.id
    };
  } catch (err: any) {
    console.error('redeemLoyaltyPointsForVoucher error:', err);
    return {
      success: false,
      newBalance: 0,
      error: err?.message || 'Failed to redeem reward voucher.'
    };
  }
}

export async function redeemPointsForBooking(
  userId: string,
  pointsToRedeem: number,
  discountAmount: number,
  bookingRef: string
): Promise<boolean> {
  try {
    if (!userId || pointsToRedeem <= 0) return true;
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentPoints = userDoc.exists() && typeof userDoc.data().loyaltyPoints === 'number'
      ? userDoc.data().loyaltyPoints
      : DEFAULT_WELCOME_POINTS;
    const currentLifetime = userDoc.exists() && typeof userDoc.data().lifetimeLoyaltyPoints === 'number'
      ? Math.max(userDoc.data().lifetimeLoyaltyPoints, currentPoints)
      : currentPoints;

    if (currentPoints < pointsToRedeem) {
      throw new Error('Insufficient loyalty points.');
    }

    const newPoints = currentPoints - pointsToRedeem;
    const nowIso = new Date().toISOString();

    await setDoc(
      userRef,
      {
        uid: userId,
        loyaltyPoints: newPoints,
        lifetimeLoyaltyPoints: currentLifetime,
        loyaltyTier: getTierForPoints(currentLifetime),
        updatedAt: nowIso
      },
      { merge: true }
    );

    // Mirror balance in gameProgress so Arcade & Loyalty remain in sync
    setDoc(
      doc(db, 'gameProgress', userId),
      {
        userId,
        pointsBalance: newPoints,
        migratedToLoyalty: true,
        updatedAt: nowIso
      },
      { merge: true }
    ).catch(() => {});

    // Record transaction
    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: 'redeemed',
      points: -pointsToRedeem,
      description: `Redeemed ${pointsToRedeem} points for ₹${discountAmount} discount on stay ${bookingRef}`,
      bookingReference: bookingRef,
      timestamp: nowIso
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
    if (!userId) return 0;

    // Idempotency guard: avoid double-crediting for the same booking reference
    try {
      const existingSnap = await getDocs(
        query(collection(db, 'loyaltyTransactions'), where('userId', '==', userId))
      );
      const alreadyCredited = existingSnap.docs.some((d) => {
        const data = d.data();
        return data.type === 'earned' && data.bookingReference === bookingRef;
      });
      if (alreadyCredited) {
        return 0;
      }
    } catch {
      // Continue safely if index/query check skips
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentPoints = userDoc.exists() && typeof userDoc.data().loyaltyPoints === 'number'
      ? userDoc.data().loyaltyPoints
      : DEFAULT_WELCOME_POINTS;
    const currentLifetime = userDoc.exists() && typeof userDoc.data().lifetimeLoyaltyPoints === 'number'
      ? Math.max(userDoc.data().lifetimeLoyaltyPoints, currentPoints)
      : currentPoints;
    const currentTier = userDoc.exists() ? (userDoc.data().loyaltyTier || getTierForPoints(currentLifetime)) : 'explorer';

    const pointsToEarn = Math.max(10, calculatePointsToEarn(totalAmount, currentTier as LoyaltyTier));
    const newPoints = currentPoints + pointsToEarn;
    const newLifetime = currentLifetime + pointsToEarn;
    const newTier = getTierForPoints(newLifetime);
    const nowIso = new Date().toISOString();

    await setDoc(
      userRef,
      {
        uid: userId,
        loyaltyPoints: newPoints,
        lifetimeLoyaltyPoints: newLifetime,
        loyaltyTier: newTier,
        updatedAt: nowIso
      },
      { merge: true }
    );

    setDoc(
      doc(db, 'gameProgress', userId),
      {
        userId,
        pointsBalance: newPoints,
        migratedToLoyalty: true,
        updatedAt: nowIso
      },
      { merge: true }
    ).catch(() => {});

    // Record transaction
    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: 'earned',
      points: pointsToEarn,
      description: `Booking Completed (${bookingRef}): Earned +${pointsToEarn} Sunlit Rewards points`,
      bookingReference: bookingRef,
      timestamp: nowIso
    });

    return pointsToEarn;
  } catch (err: any) {
    console.error('Error awarding loyalty points:', err);
    return 0;
  }
}

export async function awardBonusPoints(
  userId: string,
  points: number,
  description: string
): Promise<boolean> {
  try {
    if (!userId || points <= 0) return false;
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const currentPoints = userDoc.exists() && typeof userDoc.data().loyaltyPoints === 'number'
      ? userDoc.data().loyaltyPoints
      : DEFAULT_WELCOME_POINTS;
    const currentLifetime = userDoc.exists() && typeof userDoc.data().lifetimeLoyaltyPoints === 'number'
      ? Math.max(userDoc.data().lifetimeLoyaltyPoints, currentPoints)
      : currentPoints;
    const newPoints = currentPoints + points;
    const newLifetime = currentLifetime + points;
    const nowIso = new Date().toISOString();

    await setDoc(
      userRef,
      {
        uid: userId,
        loyaltyPoints: newPoints,
        lifetimeLoyaltyPoints: newLifetime,
        loyaltyTier: getTierForPoints(newLifetime),
        updatedAt: nowIso
      },
      { merge: true }
    );

    setDoc(
      doc(db, 'gameProgress', userId),
      {
        userId,
        pointsBalance: newPoints,
        migratedToLoyalty: true,
        updatedAt: nowIso
      },
      { merge: true }
    ).catch(() => {});

    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: 'bonus',
      points,
      description,
      timestamp: nowIso
    });
    return true;
  } catch (err) {
    console.error('Error awarding bonus points:', err);
    return false;
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
    const currentPoints = userDoc.exists() && typeof userDoc.data().loyaltyPoints === 'number'
      ? userDoc.data().loyaltyPoints
      : DEFAULT_WELCOME_POINTS;
    const currentLifetime = userDoc.exists() && typeof userDoc.data().lifetimeLoyaltyPoints === 'number'
      ? Math.max(userDoc.data().lifetimeLoyaltyPoints, currentPoints)
      : currentPoints;
    const newPoints = Math.max(0, currentPoints + pointsAdjustment);
    const newLifetime = pointsAdjustment > 0 ? currentLifetime + pointsAdjustment : currentLifetime;
    const nowIso = new Date().toISOString();

    await updateDoc(userRef, {
      loyaltyPoints: newPoints,
      lifetimeLoyaltyPoints: newLifetime,
      loyaltyTier: getTierForPoints(newLifetime),
      updatedAt: nowIso
    });

    await addDoc(collection(db, 'loyaltyTransactions'), {
      userId,
      type: pointsAdjustment >= 0 ? 'bonus' : 'adjustment',
      points: pointsAdjustment,
      description: `Admin Adjustment (${adminEmail}): ${reason}`,
      timestamp: nowIso
    });

    return true;
  } catch (err: any) {
    console.error('Error adjusting points:', err);
    return false;
  }
}
