import type { Booking, BookingStatus, InventoryHold, Room, RoomLockSlot } from '../types';

export const HOLD_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_BOOKING_NIGHTS = 180;

/**
 * Statuses that do NOT occupy room inventory.
 * Any booking in these states is ignored during availability checks.
 */
export const NON_BLOCKING_BOOKING_STATUSES = new Set<string>([
  'cancelled',
  'rejected',
  'expired',
  'failed',
  'checked_out',
  'completed',
  'refunded',
]);

/**
 * Statuses that actively block room inventory.
 */
export const BLOCKING_BOOKING_STATUSES = new Set<string>([
  'pending',
  'held',
  'pending_approval',
  'new_request',
  'awaiting_approval',
  'awaiting_admin_approval',
  'awaiting_customer_confirmation',
  'confirmed',
  'payment_pending',
  'payment_verification_pending',
  'payment_verified',
  'paid',
  'checkin_due',
  'checked_in',
  'checkout_due',
  'cancellation_requested',
  'refund_pending',
]);

/**
 * Canonical allowed status transitions so invalid jumps (e.g. cancelled -> confirmed)
 * are rejected consistently across services, UI, and tests.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<string, Set<string>> = {
  held: new Set(['pending', 'confirmed', 'cancelled', 'expired', 'failed']),
  pending: new Set([
    'pending_approval',
    'awaiting_admin_approval',
    'awaiting_customer_confirmation',
    'confirmed',
    'payment_pending',
    'payment_verified',
    'cancelled',
    'cancellation_requested',
    'rejected',
    'expired',
    'failed',
  ]),
  pending_approval: new Set([
    'awaiting_customer_confirmation',
    'confirmed',
    'rejected',
    'cancelled',
    'cancellation_requested',
    'expired',
  ]),
  new_request: new Set(['pending', 'pending_approval', 'confirmed', 'rejected', 'cancelled']),
  awaiting_approval: new Set(['awaiting_customer_confirmation', 'confirmed', 'rejected', 'cancelled']),
  awaiting_admin_approval: new Set(['awaiting_customer_confirmation', 'confirmed', 'rejected', 'cancelled']),
  awaiting_customer_confirmation: new Set(['pending', 'confirmed', 'cancelled', 'cancellation_requested', 'rejected']),
  payment_pending: new Set(['payment_verification_pending', 'payment_verified', 'confirmed', 'cancelled', 'expired', 'failed']),
  payment_verification_pending: new Set(['payment_verified', 'confirmed', 'cancelled', 'rejected']),
  payment_verified: new Set(['confirmed', 'checked_in', 'cancelled', 'cancellation_requested']),
  paid: new Set(['confirmed', 'checked_in', 'cancellation_requested', 'cancelled']),
  confirmed: new Set([
    'awaiting_customer_confirmation',
    'checkin_due',
    'checked_in',
    'cancellation_requested',
    'cancelled',
    'rejected',
    'completed',
  ]),
  checkin_due: new Set(['checked_in', 'cancelled', 'cancellation_requested']),
  checked_in: new Set(['checkout_due', 'checked_out', 'completed']),
  checkout_due: new Set(['checked_out', 'completed']),
  checked_out: new Set(['completed']),
  cancellation_requested: new Set(['cancelled', 'confirmed', 'refund_pending']),
  refund_pending: new Set(['refunded', 'cancelled']),
  refunded: new Set([]),
  cancelled: new Set([]),
  rejected: new Set([]),
  expired: new Set([]),
  failed: new Set(['pending']),
  completed: new Set([]),
};

export function isValidStatusTransition(fromStatus: BookingStatus | string, toStatus: BookingStatus | string): boolean {
  if (!fromStatus || !toStatus) return false;
  if (fromStatus === toStatus) return true;
  const allowed = ALLOWED_STATUS_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.has(toStatus);
}

/**
 * Returns today's canonical YYYY-MM-DD string in Asia/Kolkata timezone (Rishikesh IST)
 * so midnight boundaries never drift based on client browser UTC offset.
 */
export function getTodayDateString(nowMs: number = Date.now()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formatted = formatter.format(new Date(nowMs));
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // Fallback below
  }
  const istOffsetMs = 330 * 60 * 1000;
  return new Date(nowMs + istOffsetMs).toISOString().slice(0, 10);
}

/**
 * Adds integer days to a YYYY-MM-DD date string using pure UTC calendar arithmetic.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const parts = parseDateParts(dateStr);
  if (!parts) {
    return getTodayDateString();
  }
  const utc = Date.UTC(parts.year, parts.month - 1, parts.day + days);
  return new Date(utc).toISOString().slice(0, 10);
}

function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const verify = new Date(Date.UTC(year, month - 1, day));
  if (
    verify.getUTCFullYear() !== year ||
    verify.getUTCMonth() !== month - 1 ||
    verify.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isValidDateString(dateStr: string): boolean {
  return parseDateParts(dateStr) !== null;
}

/**
 * Calculates whole nights between two YYYY-MM-DD dates using UTC midnight timestamps.
 * Returns 0 if invalid or checkOut <= checkIn.
 */
export function calculateNights(checkInDate: string, checkOutDate: string): number {
  const start = parseDateParts(checkInDate);
  const end = parseDateParts(checkOutDate);
  if (!start || !end) return 0;
  const startMs = Date.UTC(start.year, start.month - 1, start.day);
  const endMs = Date.UTC(end.year, end.month - 1, end.day);
  if (endMs <= startMs) return 0;
  return Math.round((endMs - startMs) / 86400000);
}

/**
 * Exact date-overlap formula required for hospitality stays:
 * Existing check-in < Requested check-out AND Existing check-out > Requested check-in.
 *
 * Notice: Check-out on day X and next Check-in on day X returns FALSE (allowed).
 */
export function datesOverlap(
  existingCheckIn: string,
  existingCheckOut: string,
  requestedCheckIn: string,
  requestedCheckOut: string
): boolean {
  if (
    !isValidDateString(existingCheckIn) ||
    !isValidDateString(existingCheckOut) ||
    !isValidDateString(requestedCheckIn) ||
    !isValidDateString(requestedCheckOut)
  ) {
    return false;
  }
  return existingCheckIn < requestedCheckOut && existingCheckOut > requestedCheckIn;
}

export interface BookingRequestValidationResult {
  valid: boolean;
  code?: 'invalid_dates' | 'room_inactive' | 'capacity_exceeded';
  error?: string;
  nights?: number;
}

export function validateBookingRequest(params: {
  room?: Pick<Room, 'isActive' | 'isMaintenance' | 'availabilityStatus' | 'totalCapacity'> | null;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  nowMs?: number;
}): BookingRequestValidationResult {
  const { room, checkInDate, checkOutDate, adults = 1, children = 0, nowMs = Date.now() } = params;

  if (!isValidDateString(checkInDate) || !isValidDateString(checkOutDate)) {
    return {
      valid: false,
      code: 'invalid_dates',
      error: 'Please select valid dates.',
    };
  }

  const todayStr = getTodayDateString(nowMs);
  if (checkInDate < todayStr) {
    return {
      valid: false,
      code: 'invalid_dates',
      error: 'Please select valid dates. Check-in cannot be in the past.',
    };
  }

  const nights = calculateNights(checkInDate, checkOutDate);
  if (nights < 1) {
    return {
      valid: false,
      code: 'invalid_dates',
      error: 'Please select valid dates. Check-out must be at least one night after check-in.',
    };
  }

  if (nights > MAX_BOOKING_NIGHTS) {
    return {
      valid: false,
      code: 'invalid_dates',
      error: `Please select valid dates. Maximum online stay duration is ${MAX_BOOKING_NIGHTS} nights.`,
    };
  }

  if (room) {
    if (
      room.isActive === false ||
      room.isMaintenance === true ||
      room.availabilityStatus === 'maintenance' ||
      room.availabilityStatus === 'blocked'
    ) {
      return {
        valid: false,
        code: 'room_inactive',
        error: 'This room is currently unavailable for maintenance or host block.',
      };
    }

    const totalGuests = Number(adults) + Number(children);
    if (Number(adults) < 1 || Number(children) < 0 || totalGuests > room.totalCapacity) {
      return {
        valid: false,
        code: 'capacity_exceeded',
        error: `Selected room accommodates up to ${room.totalCapacity} guest${room.totalCapacity === 1 ? '' : 's'}.`,
      };
    }
  }

  return { valid: true, nights };
}

export function isSlotBlocking(slot: RoomLockSlot, nowMs: number = Date.now()): boolean {
  if (!slot || !slot.checkInDate || !slot.checkOutDate) return false;
  if (slot.kind === 'hold') {
    if (slot.status !== 'held') return false;
    return typeof slot.expiresAtMs === 'number' && slot.expiresAtMs > nowMs;
  }
  return !NON_BLOCKING_BOOKING_STATUSES.has(slot.status);
}

export function pruneExpiredHoldSlots(slots: RoomLockSlot[], nowMs: number = Date.now()): RoomLockSlot[] {
  if (!Array.isArray(slots)) return [];
  return slots.filter((slot) => isSlotBlocking(slot, nowMs));
}

export type RoomAvailabilityStatus =
  | 'available'
  | 'already_booked'
  | 'temporarily_held'
  | 'invalid_dates'
  | 'room_inactive'
  | 'capacity_exceeded';

export interface AvailabilityCheckResult {
  available: boolean;
  status: RoomAvailabilityStatus;
  message: string;
  nights?: number;
  conflictingBookingId?: string;
  conflictingHoldId?: string;
  holdExpiresAtMs?: number;
}

/**
 * Pure availability evaluation used both client-side and inside Firestore transactions.
 * Guarantees:
 * - Ignores cancelled, rejected, expired, failed, checked_out, completed bookings.
 * - Ignores expired holds automatically without waiting for background cleanup.
 * - Never allows a customer to block their own active hold.
 * - Treats checkOutDate == next checkInDate as non-overlapping (allowed).
 */
export function evaluateRoomAvailability(params: {
  slots: RoomLockSlot[];
  checkInDate: string;
  checkOutDate: string;
  requestingUserId?: string | null;
  room?: Pick<Room, 'isActive' | 'isMaintenance' | 'availabilityStatus' | 'totalCapacity'> | null;
  adults?: number;
  children?: number;
  excludeBookingId?: string;
  nowMs?: number;
}): AvailabilityCheckResult {
  const {
    slots,
    checkInDate,
    checkOutDate,
    requestingUserId,
    room,
    adults,
    children,
    excludeBookingId,
    nowMs = Date.now(),
  } = params;

  const validation = validateBookingRequest({
    room,
    checkInDate,
    checkOutDate,
    adults,
    children,
    nowMs,
  });

  if (!validation.valid) {
    return {
      available: false,
      status: validation.code || 'invalid_dates',
      message: validation.error || 'Please select valid dates.',
    };
  }

  const activeSlots = pruneExpiredHoldSlots(slots, nowMs);

  // 1. Check active confirmed / pending bookings first
  for (const slot of activeSlots) {
    if (slot.kind !== 'booking') continue;
    if (excludeBookingId && slot.slotId === excludeBookingId) continue;

    if (datesOverlap(slot.checkInDate, slot.checkOutDate, checkInDate, checkOutDate)) {
      return {
        available: false,
        status: 'already_booked',
        message: 'Room is already booked.',
        conflictingBookingId: slot.slotId,
      };
    }
  }

  // 2. Check active unexpired holds (other guests only — never block caller's own hold)
  for (const slot of activeSlots) {
    if (slot.kind !== 'hold') continue;
    if (requestingUserId && slot.userId === requestingUserId) continue;

    if (datesOverlap(slot.checkInDate, slot.checkOutDate, checkInDate, checkOutDate)) {
      return {
        available: false,
        status: 'temporarily_held',
        message: 'Room is temporarily held.',
        conflictingHoldId: slot.slotId,
        holdExpiresAtMs: slot.expiresAtMs,
      };
    }
  }

  return {
    available: true,
    status: 'available',
    message: 'Room is available.',
    nights: validation.nights,
  };
}

/**
 * Converts existing bookings and unexpired holds into canonical RoomLockSlot[] per room.
 * Useful for admin dashboard reconciliation and pure unit testing.
 */
export function buildRoomLockSlotsFromRecords(
  bookings: Pick<Booking, 'id' | 'roomId' | 'userId' | 'checkInDate' | 'checkOutDate' | 'status' | 'updatedAt' | 'createdAt'>[],
  holds: InventoryHold[] = [],
  nowMs: number = Date.now()
): Record<string, RoomLockSlot[]> {
  const map: Record<string, RoomLockSlot[]> = {};

  for (const b of bookings) {
    if (!b.roomId || !b.checkInDate || !b.checkOutDate) continue;
    if (NON_BLOCKING_BOOKING_STATUSES.has(b.status)) continue;
    if (!map[b.roomId]) map[b.roomId] = [];
    map[b.roomId].push({
      slotId: b.id,
      kind: 'booking',
      userId: b.userId || '',
      checkInDate: b.checkInDate,
      checkOutDate: b.checkOutDate,
      status: b.status,
      updatedAt: b.updatedAt || b.createdAt || new Date(nowMs).toISOString(),
    });
  }

  for (const h of holds) {
    if (!h.roomId || !h.checkInDate || !h.checkOutDate) continue;
    if (h.status !== 'held' || h.expiresAtMs <= nowMs) continue;
    if (!map[h.roomId]) map[h.roomId] = [];
    map[h.roomId].push({
      slotId: h.holdId || h.id,
      kind: 'hold',
      userId: h.userId,
      checkInDate: h.checkInDate,
      checkOutDate: h.checkOutDate,
      status: 'held',
      expiresAtMs: h.expiresAtMs,
      updatedAt: h.updatedAt || h.createdAt || new Date(nowMs).toISOString(),
    });
  }

  return map;
}
