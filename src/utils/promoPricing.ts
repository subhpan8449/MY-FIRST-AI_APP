import { Offer, GameRewardVoucher } from '../types';

export interface PromoEvaluationInput {
  promoCode: string;
  nights: number;
  roomSubtotal: number;
  availableOffers?: Offer[];
  userVouchers?: GameRewardVoucher[];
}

export interface PromoEvaluationResult {
  discountAmount: number;
  appliedPromo: {
    code: string;
    name: string;
    discount: number;
    source: 'offer' | 'voucher' | 'builtin';
    voucherId?: string;
  } | null;
  promoError: string | null;
  matchedOffer?: Offer | null;
  matchedVoucher?: GameRewardVoucher | null;
}

export function normalizePromoCode(raw: string): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * Evaluates a promo code or arcade reward voucher against:
 * 1. Active Firestore offers (including admin-created custom offers)
 * 2. The signed-in user's persisted Firestore game reward vouchers
 * 3. Built-in official Devashish Sunlit Homestay promo codes
 */
export function evaluatePromoCode(input: PromoEvaluationInput): PromoEvaluationResult {
  const code = normalizePromoCode(input.promoCode);
  const nights = Math.max(1, Math.floor(Number(input.nights) || 1));
  const roomSubtotal = Math.max(0, Math.round(Number(input.roomSubtotal) || 0));

  if (!code) {
    return {
      discountAmount: 0,
      appliedPromo: null,
      promoError: null,
      matchedOffer: null,
      matchedVoucher: null
    };
  }

  // 1. Check Firestore Offers first (supports admin-created & edited offers)
  const matchedOffer = (input.availableOffers || []).find(
    (o) => normalizePromoCode(o.code) === code
  );
  if (matchedOffer) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const minStay = Math.max(1, Number(matchedOffer.minStay) || 1);

    if (matchedOffer.isActive === false) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `Promo code ${code} is currently inactive.`,
        matchedOffer,
        matchedVoucher: null
      };
    }
    if (matchedOffer.validFrom && todayIso < String(matchedOffer.validFrom).slice(0, 10)) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `Promo code ${code} starts on ${matchedOffer.validFrom}.`,
        matchedOffer,
        matchedVoucher: null
      };
    }
    if (matchedOffer.validTo && todayIso > String(matchedOffer.validTo).slice(0, 10)) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `Promo code ${code} expired on ${matchedOffer.validTo}.`,
        matchedOffer,
        matchedVoucher: null
      };
    }
    if (nights < minStay) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `${code} requires a minimum stay of ${minStay} night${minStay > 1 ? 's' : ''} (you selected ${nights} night${nights > 1 ? 's' : ''}).`,
        matchedOffer,
        matchedVoucher: null
      };
    }

    const val = Math.max(0, Number(matchedOffer.discountValue) || 0);
    const maxCap =
      Number(matchedOffer.maxDiscount) > 0 ? Number(matchedOffer.maxDiscount) : roomSubtotal;
    let discount = 0;
    if (matchedOffer.discountType === 'percentage') {
      const pct = Math.min(val, 60);
      discount = Math.min(Math.round((roomSubtotal * pct) / 100), maxCap, roomSubtotal);
    } else {
      discount = Math.min(Math.round(val), maxCap, roomSubtotal);
    }

    return {
      discountAmount: discount,
      appliedPromo: {
        code,
        name: matchedOffer.name || `${code} Offer`,
        discount,
        source: 'offer'
      },
      promoError: null,
      matchedOffer,
      matchedVoucher: null
    };
  }

  // 2. Check User's Persisted Game Reward Vouchers
  const matchedVoucher = (input.userVouchers || []).find(
    (v) => normalizePromoCode(v.code || v.voucherCode) === code
  );
  if (matchedVoucher) {
    const isUsed = matchedVoucher.isUsed === true || matchedVoucher.status === 'used';
    const isExpired =
      matchedVoucher.status === 'expired' ||
      (matchedVoucher.expiresAt && new Date(matchedVoucher.expiresAt).getTime() < Date.now());
    const minSpend = Math.max(0, Number(matchedVoucher.minBookingAmount) || 0);
    const voucherDisc = Math.max(0, Math.min(Number(matchedVoucher.discountAmount) || 0, 1000));

    if (isUsed) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `Reward voucher ${code} has already been redeemed.`,
        matchedOffer: null,
        matchedVoucher
      };
    }
    if (isExpired) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `Reward voucher ${code} has expired.`,
        matchedOffer: null,
        matchedVoucher
      };
    }
    if (roomSubtotal < minSpend) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `Voucher ${code} requires a minimum booking subtotal of ₹${minSpend.toLocaleString('en-IN')} (current: ₹${roomSubtotal.toLocaleString('en-IN')}).`,
        matchedOffer: null,
        matchedVoucher
      };
    }

    const discount = Math.min(voucherDisc, roomSubtotal);
    return {
      discountAmount: discount,
      appliedPromo: {
        code,
        name: matchedVoucher.rewardName || `Sunlit Arcade Voucher (-₹${voucherDisc})`,
        discount,
        source: 'voucher',
        voucherId: matchedVoucher.id
      },
      promoError: null,
      matchedOffer: null,
      matchedVoucher
    };
  }

  // 3. Built-in Official Promo Codes
  if (code === 'STUDENT500') {
    const discount = Math.min(500, roomSubtotal);
    return {
      discountAmount: discount,
      appliedPromo: {
        code: 'STUDENT500',
        name: 'Student & Solo Explorer Special',
        discount,
        source: 'builtin'
      },
      promoError: null,
      matchedOffer: null,
      matchedVoucher: null
    };
  }

  if (code === 'LONGSTAY20') {
    if (nights < 7) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `LONGSTAY20 requires a minimum stay of 7 nights (you selected ${nights} night${nights > 1 ? 's' : ''}).`,
        matchedOffer: null,
        matchedVoucher: null
      };
    }
    const discount = Math.min(Math.round((roomSubtotal * 20) / 100), 5000, roomSubtotal);
    return {
      discountAmount: discount,
      appliedPromo: {
        code: 'LONGSTAY20',
        name: 'Long-Stay Himalayan Explorer (20% Off)',
        discount,
        source: 'builtin'
      },
      promoError: null,
      matchedOffer: null,
      matchedVoucher: null
    };
  }

  if (code === 'SUNLITCOUPLE') {
    if (nights < 2) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `SUNLITCOUPLE requires a minimum stay of 2 nights (you selected ${nights} night).`,
        matchedOffer: null,
        matchedVoucher: null
      };
    }
    const discount = Math.min(Math.round((roomSubtotal * 12) / 100), 1000, roomSubtotal);
    return {
      discountAmount: discount,
      appliedPromo: {
        code: 'SUNLITCOUPLE',
        name: 'Couple Tapovan Getaway (12% Off)',
        discount,
        source: 'builtin'
      },
      promoError: null,
      matchedOffer: null,
      matchedVoucher: null
    };
  }

  if (code === 'PILGRIM10') {
    const discount = Math.min(Math.round((roomSubtotal * 10) / 100), 800, roomSubtotal);
    return {
      discountAmount: discount,
      appliedPromo: {
        code: 'PILGRIM10',
        name: 'Char Dham Pilgrim & Senior Citizen (10% Off)',
        discount,
        source: 'builtin'
      },
      promoError: null,
      matchedOffer: null,
      matchedVoucher: null
    };
  }

  // 4. Pattern-matched Arcade Voucher fallback (for printed/copied codes)
  const voucherMatch = code.match(/^(?:GANGA|QUEST|SUNLIT)(25|50|100|250|500)(?:-[A-Z0-9]+)?$/);
  if (voucherMatch) {
    const val = Number(voucherMatch[1]);
    const minSpend = val >= 250 ? 1500 : 500;
    if (roomSubtotal < minSpend) {
      return {
        discountAmount: 0,
        appliedPromo: null,
        promoError: `Voucher ${code} requires a minimum booking amount of ₹${minSpend.toLocaleString('en-IN')}.`,
        matchedOffer: null,
        matchedVoucher: null
      };
    }
    const discount = Math.min(val, roomSubtotal);
    return {
      discountAmount: discount,
      appliedPromo: {
        code,
        name: `Sunlit Arcade ₹${val} Reward`,
        discount,
        source: 'voucher'
      },
      promoError: null,
      matchedOffer: null,
      matchedVoucher: null
    };
  }

  return {
    discountAmount: 0,
    appliedPromo: null,
    promoError: `Promo code "${code}" is not valid. Try STUDENT500, PILGRIM10, SUNLITCOUPLE (2+ nights), or LONGSTAY20 (7+ nights).`,
    matchedOffer: null,
    matchedVoucher: null
  };
}
