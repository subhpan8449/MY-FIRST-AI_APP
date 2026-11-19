import assert from 'node:assert/strict';
import { evaluatePromoCode, normalizePromoCode } from '../src/utils/promoPricing';
import {
  calculateMaxLoyaltyRedemption,
  calculatePointsToEarn,
  getTierForPoints,
  POINTS_TO_RUPEE_RATE
} from '../src/services/loyaltyService';
import { Offer, GameRewardVoucher } from '../src/types';

const sampleOffers: Offer[] = [
  {
    id: 'offer-student',
    name: 'Student & Solo Explorer Special',
    code: 'STUDENT500',
    description: 'Flat ₹500 off on room bookings with student ID',
    discountType: 'fixed',
    discountValue: 500,
    minStay: 1,
    maxDiscount: 500,
    validFrom: '2024-01-01',
    validTo: '2029-12-31',
    eligibleCategories: ['All Rooms'],
    requiresIdVerification: true,
    isActive: true
  },
  {
    id: 'offer-long',
    name: 'Long-Stay Himalayan Explorer',
    code: 'LONGSTAY20',
    description: '20% off for 7+ nights',
    discountType: 'percentage',
    discountValue: 20,
    minStay: 7,
    maxDiscount: 5000,
    validFrom: '2024-01-01',
    validTo: '2029-12-31',
    eligibleCategories: ['All Rooms'],
    requiresIdVerification: false,
    isActive: true
  },
  {
    id: 'offer-custom',
    name: 'Diwali Custom Admin Deal',
    code: 'DIWALI300',
    description: 'Admin custom flat ₹300 off',
    discountType: 'fixed',
    discountValue: 300,
    minStay: 2,
    maxDiscount: 300,
    validFrom: '2024-01-01',
    validTo: '2029-12-31',
    eligibleCategories: ['All Rooms'],
    requiresIdVerification: false,
    isActive: true
  },
  {
    id: 'offer-expired',
    name: 'Old Expired Offer',
    code: 'OLD2020',
    description: 'Expired promo',
    discountType: 'fixed',
    discountValue: 400,
    minStay: 1,
    maxDiscount: 400,
    validFrom: '2020-01-01',
    validTo: '2020-12-31',
    eligibleCategories: ['All Rooms'],
    requiresIdVerification: false,
    isActive: true
  }
];

const futureIso = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
const pastIso = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

const sampleVouchers: GameRewardVoucher[] = [
  {
    id: 'v1',
    userId: 'u1',
    userEmail: 'guest@example.com',
    code: 'GANGA100-AB12',
    voucherCode: 'GANGA100-AB12',
    rewardTierId: 'tier_100',
    rewardName: 'Tapovan Pilgrim',
    discountAmount: 100,
    minBookingAmount: 799,
    status: 'active',
    isUsed: false,
    expiresAt: futureIso,
    createdAt: new Date().toISOString()
  },
  {
    id: 'v2',
    userId: 'u1',
    userEmail: 'guest@example.com',
    code: 'GANGA250-USED',
    voucherCode: 'GANGA250-USED',
    rewardTierId: 'tier_250',
    rewardName: 'Himalayan Patron',
    discountAmount: 250,
    minBookingAmount: 1500,
    status: 'used',
    isUsed: true,
    expiresAt: futureIso,
    createdAt: new Date().toISOString()
  },
  {
    id: 'v3',
    userId: 'u1',
    userEmail: 'guest@example.com',
    code: 'GANGA50-OLD1',
    voucherCode: 'GANGA50-OLD1',
    rewardTierId: 'tier_50',
    rewardName: 'Ganga Explorer',
    discountAmount: 50,
    minBookingAmount: 599,
    status: 'active',
    isUsed: false,
    expiresAt: pastIso,
    createdAt: new Date().toISOString()
  }
];

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`PASS: ${name}`);
}

test('normalizePromoCode trims, strips spaces, and uppercases', () => {
  assert.equal(normalizePromoCode('  student 500  '), 'STUDENT500');
});

test('STUDENT500 applies flat ₹500 discount on 1-night stay', () => {
  const res = evaluatePromoCode({
    promoCode: 'student500',
    nights: 1,
    roomSubtotal: 999,
    availableOffers: sampleOffers,
    userVouchers: sampleVouchers
  });
  assert.equal(res.promoError, null);
  assert.equal(res.discountAmount, 500);
  assert.equal(res.appliedPromo?.code, 'STUDENT500');
});

test('PILGRIM10 applies 10% up to ₹800 cap', () => {
  const res1 = evaluatePromoCode({ promoCode: 'PILGRIM10', nights: 2, roomSubtotal: 2400 });
  assert.equal(res1.promoError, null);
  assert.equal(res1.discountAmount, 240);

  const res2 = evaluatePromoCode({ promoCode: 'PILGRIM10', nights: 10, roomSubtotal: 15000 });
  assert.equal(res2.promoError, null);
  assert.equal(res2.discountAmount, 800);
});

test('SUNLITCOUPLE rejects 1 night with clear reason and succeeds on 2+ nights', () => {
  const fail = evaluatePromoCode({ promoCode: 'SUNLITCOUPLE', nights: 1, roomSubtotal: 1099 });
  assert.equal(fail.discountAmount, 0);
  assert.match(fail.promoError || '', /minimum stay of 2 nights/i);

  const ok = evaluatePromoCode({ promoCode: 'SUNLITCOUPLE', nights: 2, roomSubtotal: 2198 });
  assert.equal(ok.promoError, null);
  assert.equal(ok.discountAmount, Math.round(2198 * 0.12));
});

test('LONGSTAY20 rejects 3 nights with clear reason and succeeds on 7+ nights', () => {
  const fail = evaluatePromoCode({
    promoCode: 'LONGSTAY20',
    nights: 3,
    roomSubtotal: 3000,
    availableOffers: sampleOffers
  });
  assert.equal(fail.discountAmount, 0);
  assert.match(fail.promoError || '', /minimum stay of 7 nights/i);

  const ok = evaluatePromoCode({
    promoCode: 'LONGSTAY20',
    nights: 7,
    roomSubtotal: 7000,
    availableOffers: sampleOffers
  });
  assert.equal(ok.promoError, null);
  assert.equal(ok.discountAmount, 1400);
});

test('Admin-created Firestore custom offer DIWALI300 works and validates minStay', () => {
  const fail = evaluatePromoCode({
    promoCode: 'DIWALI300',
    nights: 1,
    roomSubtotal: 1200,
    availableOffers: sampleOffers
  });
  assert.match(fail.promoError || '', /minimum stay of 2 nights/i);

  const ok = evaluatePromoCode({
    promoCode: 'DIWALI300',
    nights: 2,
    roomSubtotal: 2400,
    availableOffers: sampleOffers
  });
  assert.equal(ok.promoError, null);
  assert.equal(ok.discountAmount, 300);
  assert.equal(ok.appliedPromo?.source, 'offer');
});

test('Expired offer is rejected cleanly', () => {
  const res = evaluatePromoCode({
    promoCode: 'OLD2020',
    nights: 2,
    roomSubtotal: 2000,
    availableOffers: sampleOffers
  });
  assert.equal(res.discountAmount, 0);
  assert.match(res.promoError || '', /expired/i);
});

test('Firestore game voucher applies when active & meets minSpend, rejects below minSpend, used, or expired', () => {
  const belowMin = evaluatePromoCode({
    promoCode: 'GANGA100-AB12',
    nights: 1,
    roomSubtotal: 599,
    userVouchers: sampleVouchers
  });
  assert.equal(belowMin.discountAmount, 0);
  assert.match(belowMin.promoError || '', /minimum booking subtotal/i);

  const ok = evaluatePromoCode({
    promoCode: 'GANGA100-AB12',
    nights: 1,
    roomSubtotal: 999,
    userVouchers: sampleVouchers
  });
  assert.equal(ok.promoError, null);
  assert.equal(ok.discountAmount, 100);
  assert.equal(ok.appliedPromo?.source, 'voucher');

  const used = evaluatePromoCode({
    promoCode: 'GANGA250-USED',
    nights: 2,
    roomSubtotal: 2500,
    userVouchers: sampleVouchers
  });
  assert.match(used.promoError || '', /already been redeemed/i);

  const expired = evaluatePromoCode({
    promoCode: 'GANGA50-OLD1',
    nights: 1,
    roomSubtotal: 999,
    userVouchers: sampleVouchers
  });
  assert.match(expired.promoError || '', /expired/i);
});

test('Unknown promo code returns clear actionable error listing valid codes', () => {
  const res = evaluatePromoCode({ promoCode: 'FAKENOTREAL', nights: 2, roomSubtotal: 2000 });
  assert.equal(res.discountAmount, 0);
  assert.match(res.promoError || '', /STUDENT500/);
});

test('Unified Loyalty points redemption & tier calculation work accurately', () => {
  assert.equal(POINTS_TO_RUPEE_RATE, 0.5);
  assert.equal(getTierForPoints(0), 'explorer');
  assert.equal(getTierForPoints(500), 'pioneer');
  assert.equal(getTierForPoints(1500), 'patron');

  const max1 = calculateMaxLoyaltyRedemption(185, 1000);
  assert.equal(max1.pointsToUse, 184);
  assert.equal(max1.discountRupees, 92);

  const max2 = calculateMaxLoyaltyRedemption(5000, 1000);
  assert.equal(max2.discountRupees, 1000);
  assert.equal(max2.pointsToUse, 2000);

  const belowMin = calculateMaxLoyaltyRedemption(15, 1000);
  assert.equal(belowMin.pointsToUse, 0);
  assert.equal(belowMin.discountRupees, 0);

  assert.equal(calculatePointsToEarn(2000, 'explorer'), 200);
  assert.equal(calculatePointsToEarn(2000, 'patron'), 300);
});

console.log(`\nAll ${passed} promo & loyalty tests passed!`);
