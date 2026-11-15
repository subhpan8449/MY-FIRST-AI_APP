import {
  getRooms,
  getOffers,
  getFacilities,
  getRooftopPackages,
  getPlayAreaSettings,
  getUserBookings,
  getCustomerFeedback
} from './db';
import { COOKNOW_CATALOG } from '../components/CookNowSection';
import { RISHIKESH_DESTINATIONS } from '../components/AttractionsSection';
import { UserProfile } from '../types';

interface CachedSnapshot {
  text: string;
  timestamp: number;
}

let cachedHomestaySnapshot: CachedSnapshot | null = null;
const CACHE_TTL_MS = 60 * 1000;

/**
 * Builds a concise, real-time textual snapshot of all live Homestay data
 * (Firestore rooms, offers, facilities, rooftop packages, play area, reviews, CookNow menu, Rishikesh places)
 * for Ask Sunlit AI & Smart Host Desk Auto-Replies.
 */
export async function getLiveHomestayContextSnapshot(activeThemeName?: string): Promise<string> {
  const now = Date.now();
  if (cachedHomestaySnapshot && now - cachedHomestaySnapshot.timestamp < CACHE_TTL_MS) {
    return activeThemeName
      ? `Active App Theme: ${activeThemeName}\n${cachedHomestaySnapshot.text}`
      : cachedHomestaySnapshot.text;
  }

  const [roomsRes, offersRes, facRes, rooftopRes, playRes, reviewsRes] = await Promise.allSettled([
    getRooms(),
    getOffers(),
    getFacilities(),
    getRooftopPackages(),
    getPlayAreaSettings(),
    getCustomerFeedback()
  ]);

  const parts: string[] = [];

  if (roomsRes.status === 'fulfilled' && roomsRes.value.length > 0) {
    const roomsList = roomsRes.value
      .filter(r => r.isActive !== false)
      .map(
        r =>
          `• Room #${r.roomNumber} (${r.name}, ${r.floor}, ${r.viewType} view): ₹${r.specialPrice || r.basePrice}/night${r.studentPrice ? ` (Student ₹${r.studentPrice})` : ''} | Status: ${r.availabilityStatus}${r.isMaintenance ? ' [Maintenance]' : ''} | Max ${r.totalCapacity} guests (${r.adultCapacity} adults, ${r.childCapacity} kids) | ${r.bedType}`
      )
      .join('\n');
    parts.push(`LIVE ROOMS & AVAILABILITY:\n${roomsList}`);
  }

  if (offersRes.status === 'fulfilled' && offersRes.value.length > 0) {
    const activeOffers = offersRes.value
      .filter(o => o.isActive)
      .map(
        o =>
          `• Code ${o.code} (${o.name}): ${o.discountType === 'percentage' ? `${o.discountValue}% off` : `₹${o.discountValue} off`} (min stay ${o.minStay} night${o.minStay > 1 ? 's' : ''}) — ${o.description}`
      )
      .join('\n');
    if (activeOffers) parts.push(`LIVE PROMO OFFERS:\n${activeOffers}`);
  }

  if (facRes.status === 'fulfilled' && facRes.value.length > 0) {
    const facs = facRes.value
      .filter(f => f.isActive)
      .map(f => `• ${f.name}: ${f.timings}${f.includedInBooking ? ' (Free with stay)' : ''}`)
      .join('\n');
    if (facs) parts.push(`LIVE FACILITIES:\n${facs}`);
  }

  if (playRes.status === 'fulfilled' && playRes.value) {
    const p = playRes.value;
    parts.push(
      `KIDS PLAY AREA: Ages ${p.minAge}-${p.maxAge} | Sessions: Morning (${p.morningSession}), Afternoon (${p.afternoonSession}), Evening (${p.eveningSession}) | Status: ${p.isClosed ? `Closed (${p.closureReason || 'Maintenance'})` : 'Open Daily'}`
    );
  }

  if (rooftopRes.status === 'fulfilled' && rooftopRes.value.length > 0) {
    const rfs = rooftopRes.value
      .filter(r => r.isActive)
      .map(r => `• ${r.name}: ₹${r.price} (${r.capacity} guests, ${r.durationHours}h, slots: ${r.availableSlots.join(', ')})`)
      .join('\n');
    if (rfs) parts.push(`ROOFTOP PACKAGES:\n${rfs}`);
  }

  // CookNow Catalog (live menu)
  const availableFood = COOKNOW_CATALOG.filter(f => f.available);
  const foodSummary = availableFood
    .map(f => `${f.name} (${f.category}) ₹${f.price} [${f.preparationMinutes}m]`)
    .join('; ');
  parts.push(`COOKNOW FULL MENU (${availableFood.length} pure veg & satvik items delivered to room/rooftop/poolside):\n${foodSummary}`);

  // Verified Rishikesh Attractions
  const attrSummary = RISHIKESH_DESTINATIONS.slice(0, 12)
    .map(a => `• ${a.name} (${a.category}, ${a.distance})${a.bestVisitingTime ? ` — Best time: ${a.bestVisitingTime}` : ''}`)
    .join('\n');
  parts.push(`NEARBY RISHIKESH ATTRACTIONS FROM HOMESTAY:\n${attrSummary}`);

  if (reviewsRes.status === 'fulfilled' && reviewsRes.value.length > 0) {
    const avg = (
      reviewsRes.value.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviewsRes.value.length
    ).toFixed(1);
    parts.push(`VERIFIED GUEST RATING: ${avg}/5 across ${reviewsRes.value.length} recent reviews.`);
  }

  const snapshotText = parts.join('\n\n');
  cachedHomestaySnapshot = { text: snapshotText, timestamp: now };

  return activeThemeName ? `Active App Theme: ${activeThemeName}\n${snapshotText}` : snapshotText;
}

/**
 * Builds personalized guest context (bookings, loyalty tier, points) for signed-in users.
 */
export async function getGuestContextSnapshot(
  userId?: string | null,
  userProfile?: UserProfile | null,
  bookingReference?: string,
  roomNumber?: string
): Promise<string> {
  const lines: string[] = [];

  if (userProfile) {
    lines.push(
      `Guest Name: ${userProfile.fullName} | Email: ${userProfile.email} | Sunlit Rewards Balance: ${userProfile.loyaltyPoints || 0} pts (${(userProfile.loyaltyTier || 'explorer').toUpperCase()} tier)`
    );
  }
  if (bookingReference) lines.push(`Active Context Booking Reference: ${bookingReference}`);
  if (roomNumber) lines.push(`Active Context Room Number: #${roomNumber}`);

  if (userId) {
    try {
      const bookings = await getUserBookings(userId);
      if (bookings.length > 0) {
        const recentBookings = bookings
          .slice(0, 4)
          .map(
            b =>
              `• Ref ${b.bookingReference}: Room ${b.roomName} | ${b.checkInDate} to ${b.checkOutDate} | Status: ${b.status} | Total: ₹${b.totalAmount} (${b.paymentStatus})`
          )
          .join('\n');
        lines.push(`RECENT BOOKINGS OF THIS GUEST:\n${recentBookings}`);
      }
    } catch {
      // ignore if user bookings fetch fails
    }
  }

  return lines.join('\n');
}
