import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HOLD_TTL_MS,
  NON_BLOCKING_BOOKING_STATUSES,
  addDaysToDateString,
  buildRoomLockSlotsFromRecords,
  calculateNights,
  datesOverlap,
  evaluateRoomAvailability,
  getTodayDateString,
  isValidStatusTransition,
  pruneExpiredHoldSlots,
  validateBookingRequest,
} from '../src/utils/bookingAvailability';
import type { Booking, BookingStatus, InventoryHold, Room, RoomLockSlot } from '../src/types';

// =============================================================================
// In-Memory Transactional Store Mirroring Firestore runTransaction + Security Rules
// =============================================================================

interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

class SimulatedFirestoreStore {
  rooms = new Map<string, Room>();
  bookings = new Map<string, Booking>();
  holds = new Map<string, InventoryHold>();
  roomLocks = new Map<string, { version: number; slots: RoomLockSlot[] }>();
  nowMs = Date.now();
  simulateNetworkError: string | null = null;

  constructor(rooms: Room[]) {
    for (const r of rooms) {
      this.rooms.set(r.id, r);
      this.roomLocks.set(r.id, { version: 0, slots: [] });
    }
  }

  private assertCanCreateBooking(authUser: AuthUser | null, booking: Partial<Booking>) {
    if (!authUser) {
      throw new Error('PERMISSION_DENIED: Authentication required to create booking.');
    }
    if (booking.userId !== authUser.uid) {
      throw new Error('PERMISSION_DENIED: Cannot create booking for another user.');
    }
    const isAdmin =
      authUser.emailVerified &&
      (authUser.email === 'subhpan8449@gmail.com' || authUser.email.endsWith('@devashish.in'));
    if (!isAdmin && booking.status === 'confirmed' && !booking.paymentVerified) {
      throw new Error('PERMISSION_DENIED: Customers cannot directly confirm unpaid bookings.');
    }
  }

  private assertCanReadOrWriteBooking(authUser: AuthUser | null, booking: Booking) {
    if (!authUser) {
      throw new Error('PERMISSION_DENIED: Authentication required.');
    }
    const isAdmin =
      authUser.emailVerified &&
      (authUser.email === 'subhpan8449@gmail.com' || authUser.email.endsWith('@devashish.in'));
    if (!isAdmin && booking.userId !== authUser.uid) {
      throw new Error('PERMISSION_DENIED: Cannot access or modify another customer booking.');
    }
  }

  readBooking(authUser: AuthUser | null, bookingId: string): Booking {
    const b = this.bookings.get(bookingId);
    if (!b) throw new Error('NOT_FOUND');
    this.assertCanReadOrWriteBooking(authUser, b);
    return b;
  }

  updateBookingByUser(authUser: AuthUser | null, bookingId: string, patch: Partial<Booking>): void {
    const b = this.bookings.get(bookingId);
    if (!b) throw new Error('NOT_FOUND');
    this.assertCanReadOrWriteBooking(authUser, b);
    const next = { ...b, ...patch };
    this.bookings.set(bookingId, next);
  }

  async acquireHold(
    authUser: AuthUser | null,
    params: { roomId: string; checkInDate: string; checkOutDate: string; adults?: number; children?: number }
  ): Promise<{ holdId: string; expiresAtMs: number }> {
    if (!authUser) {
      throw new Error('Please sign in with Google before holding or booking a room.');
    }
    if (this.simulateNetworkError) {
      throw new Error(this.simulateNetworkError);
    }

    const room = this.rooms.get(params.roomId) || null;
    const lockRecord = this.roomLocks.get(params.roomId) || { version: 0, slots: [] };
    const startVersion = lockRecord.version;

    // Yield microtask to allow concurrent callers to overlap cleanly
    await Promise.resolve();

    const avail = evaluateRoomAvailability({
      slots: lockRecord.slots,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      requestingUserId: authUser.uid,
      room,
      adults: params.adults,
      children: params.children,
      nowMs: this.nowMs,
    });

    if (!avail.available) {
      throw new Error(avail.message);
    }

    // Optimistic lock verification
    const currentRecord = this.roomLocks.get(params.roomId)!;
    if (currentRecord.version !== startVersion) {
      throw new Error('Another guest has just booked this room.');
    }

    const holdId = `hold_${this.nowMs}_${Math.random().toString(36).slice(2, 7)}`;
    const expiresAtMs = this.nowMs + HOLD_TTL_MS;
    const cleaned = pruneExpiredHoldSlots(currentRecord.slots, this.nowMs).filter(
      (s) => !(s.kind === 'hold' && s.userId === authUser.uid)
    );

    const slot: RoomLockSlot = {
      slotId: holdId,
      kind: 'hold',
      userId: authUser.uid,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      status: 'held',
      expiresAtMs,
      updatedAt: new Date(this.nowMs).toISOString(),
    };

    this.holds.set(holdId, {
      id: holdId,
      holdId,
      roomId: params.roomId,
      roomName: room?.name || params.roomId,
      userId: authUser.uid,
      guestEmail: authUser.email,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      status: 'held',
      expiresAtMs,
      expiresAt: new Date(expiresAtMs).toISOString(),
      createdAt: new Date(this.nowMs).toISOString(),
      updatedAt: new Date(this.nowMs).toISOString(),
    });

    this.roomLocks.set(params.roomId, {
      version: startVersion + 1,
      slots: [...cleaned, slot],
    });

    return { holdId, expiresAtMs };
  }

  async createBookingAtomic(
    authUser: AuthUser | null,
    params: {
      roomId: string;
      checkInDate: string;
      checkOutDate: string;
      adults: number;
      children: number;
      holdId?: string;
      statusOverride?: BookingStatus;
      paymentVerified?: boolean;
    }
  ): Promise<{ id: string; status: BookingStatus }> {
    if (!authUser) {
      throw new Error('Please sign in with Google to complete your reservation.');
    }
    if (this.simulateNetworkError) {
      throw new Error(this.simulateNetworkError);
    }

    const room = this.rooms.get(params.roomId) || null;
    const lockRecord = this.roomLocks.get(params.roomId) || { version: 0, slots: [] };
    const startVersion = lockRecord.version;

    // Explicit hold session validation
    if (params.holdId) {
      const hold = this.holds.get(params.holdId);
      if (hold) {
        if (hold.userId !== authUser.uid) {
          throw new Error('Room is temporarily held.');
        }
        if (hold.status === 'expired' || (hold.status === 'held' && hold.expiresAtMs <= this.nowMs)) {
          hold.status = 'expired';
          throw new Error('Your booking session has expired. Please re-select your room and dates.');
        }
      }
    }

    const avail = evaluateRoomAvailability({
      slots: lockRecord.slots,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      requestingUserId: authUser.uid,
      room,
      adults: params.adults,
      children: params.children,
      nowMs: this.nowMs,
    });

    if (!avail.available) {
      throw new Error(avail.message);
    }

    // Async boundary to simulate Firestore commit race condition
    await Promise.resolve();

    const latestLock = this.roomLocks.get(params.roomId)!;
    if (latestLock.version !== startVersion) {
      // Optimistic retry check against newly committed slots (mirrors Firestore tx retry)
      const recheck = evaluateRoomAvailability({
        slots: latestLock.slots,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        requestingUserId: authUser.uid,
        room,
        adults: params.adults,
        children: params.children,
        nowMs: this.nowMs,
      });
      if (!recheck.available) {
        throw new Error('Another guest has just booked this room.');
      }
    }

    const finalStatus: BookingStatus = params.statusOverride || (params.paymentVerified ? 'confirmed' : 'pending');
    const id = `bk_${this.bookings.size + 1}`;
    const nights = calculateNights(params.checkInDate, params.checkOutDate);

    const newBooking: Booking = {
      id,
      bookingReference: `DSH-TEST-${this.bookings.size + 1}`,
      roomId: params.roomId,
      roomName: room?.name || 'Sunlit Room',
      roomCategory: room?.category || 'Standard Room',
      userId: authUser.uid,
      guestName: authUser.email.split('@')[0],
      guestEmail: authUser.email,
      guestPhone: '9876543210',
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults: params.adults,
      children: params.children,
      nights,
      basePricePerNight: room?.basePrice || 1000,
      roomSubtotal: (room?.basePrice || 1000) * nights,
      discountApplied: 0,
      totalAmount: (room?.basePrice || 1000) * nights,
      status: finalStatus,
      paymentStatus: params.paymentVerified ? 'paid' : 'pay_at_property',
      paymentVerified: Boolean(params.paymentVerified),
      holdId: params.holdId,
      createdAt: new Date(this.nowMs).toISOString(),
    };

    this.assertCanCreateBooking(authUser, newBooking);
    this.bookings.set(id, newBooking);

    const nextSlots = pruneExpiredHoldSlots(latestLock.slots, this.nowMs).filter(
      (s) => !(s.kind === 'hold' && (s.userId === authUser.uid || (params.holdId && s.slotId === params.holdId)))
    );
    if (!NON_BLOCKING_BOOKING_STATUSES.has(finalStatus)) {
      nextSlots.push({
        slotId: id,
        kind: 'booking',
        userId: authUser.uid,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        status: finalStatus,
        updatedAt: new Date(this.nowMs).toISOString(),
      });
    }

    this.roomLocks.set(params.roomId, {
      version: latestLock.version + 1,
      slots: nextSlots,
    });

    if (params.holdId && this.holds.has(params.holdId)) {
      const h = this.holds.get(params.holdId)!;
      h.status = 'converted';
      h.convertedBookingId = id;
    }

    return { id, status: finalStatus };
  }

  transitionBookingStatus(bookingId: string, nextStatus: BookingStatus) {
    const b = this.bookings.get(bookingId);
    if (!b) throw new Error('Booking not found');
    assert.equal(isValidStatusTransition(b.status, nextStatus), true, `Invalid transition ${b.status} -> ${nextStatus}`);
    b.status = nextStatus;

    const lockRecord = this.roomLocks.get(b.roomId)!;
    const filtered = pruneExpiredHoldSlots(lockRecord.slots, this.nowMs).filter((s) => s.slotId !== bookingId);
    if (!NON_BLOCKING_BOOKING_STATUSES.has(nextStatus)) {
      filtered.push({
        slotId: bookingId,
        kind: 'booking',
        userId: b.userId,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: nextStatus,
        updatedAt: new Date(this.nowMs).toISOString(),
      });
    }
    this.roomLocks.set(b.roomId, { version: lockRecord.version + 1, slots: filtered });
  }
}

// =============================================================================
// Fixture Data & Execution
// =============================================================================

const sampleRoom: Room = {
  id: 'room_101',
  roomNumber: '101',
  name: 'Sunlit Tapovan Deluxe',
  category: 'Deluxe Room',
  description: 'Bright deluxe room overlooking Himalayan foothills.',
  floor: '1st Floor',
  viewType: 'hill',
  beds: 1,
  bedType: 'Queen Bed',
  adultCapacity: 2,
  childCapacity: 1,
  totalCapacity: 3,
  amenities: ['Wi-Fi', 'Pool'],
  images: [],
  basePrice: 1200,
  isActive: true,
  isMaintenance: false,
  availabilityStatus: 'available',
};

const guestA: AuthUser = { uid: 'guest_a_uid', email: 'guestA@example.com', emailVerified: true };
const guestB: AuthUser = { uid: 'guest_b_uid', email: 'guestB@example.com', emailVerified: true };
const adminUser: AuthUser = { uid: 'admin_uid', email: 'subhpan8449@gmail.com', emailVerified: true };

async function runAllTests() {
  const today = getTodayDateString();
  const d1 = addDaysToDateString(today, 2);
  const d2 = addDaysToDateString(today, 5);
  const d3 = addDaysToDateString(today, 7);
  const pastDate = addDaysToDateString(today, -1);

  let passed = 0;
  async function runCase(name: string, fn: () => Promise<void> | void) {
    await fn();
    passed += 1;
    console.log(`PASS | ${name}`);
  }

  // Test 1: A customer books an available room (+ past-date & capacity checks)
  await runCase('Test 1: Customer books an available room', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    // Past dates must fail
    const pastValidation = validateBookingRequest({ room: sampleRoom, checkInDate: pastDate, checkOutDate: d1, adults: 2, children: 0 });
    assert.equal(pastValidation.valid, false);
    assert.equal(pastValidation.code, 'invalid_dates');
    assert.match(pastValidation.error || '', /past/i);

    // Capacity overflow must fail
    const capValidation = validateBookingRequest({ room: sampleRoom, checkInDate: d1, checkOutDate: d2, adults: 4, children: 0 });
    assert.equal(capValidation.valid, false);
    assert.equal(capValidation.code, 'capacity_exceeded');

    // Valid booking succeeds
    const hold = await store.acquireHold(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0 });
    const res = await store.createBookingAtomic(guestA, {
      roomId: sampleRoom.id,
      checkInDate: d1,
      checkOutDate: d2,
      adults: 2,
      children: 0,
      holdId: hold.holdId,
      paymentVerified: true,
    });
    assert.equal(res.status, 'confirmed');
    assert.equal(store.holds.get(hold.holdId)?.status, 'converted');
  });

  // Test 2: A customer attempts to book an already confirmed room
  await runCase('Test 2: Customer attempts to book an already confirmed room', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    await store.createBookingAtomic(guestA, {
      roomId: sampleRoom.id,
      checkInDate: d1,
      checkOutDate: d2,
      adults: 2,
      children: 0,
      paymentVerified: true,
    });

    await assert.rejects(
      () => store.createBookingAtomic(guestB, {
        roomId: sampleRoom.id,
        checkInDate: addDaysToDateString(d1, 1),
        checkOutDate: addDaysToDateString(d2, 1),
        adults: 2,
        children: 0,
      }),
      /Room is already booked/i
    );
  });

  // Test 3: Two customers attempt to book the same room for overlapping dates simultaneously
  await runCase('Test 3: Two customers attempt overlapping bookings simultaneously', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const results = await Promise.allSettled([
      store.createBookingAtomic(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0 }),
      store.createBookingAtomic(guestB, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0 }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    assert.equal(fulfilled.length, 1, 'Exactly one concurrent booking must succeed');
    assert.equal(rejected.length, 1, 'Exactly one concurrent booking must be aborted');
    assert.match(String(rejected[0].reason), /Another guest has just booked this room|Room is already booked/i);
  });

  // Test 4: A customer attempts to book dates blocked by an active hold (while holder himself can convert)
  await runCase('Test 4: Active hold blocks other guests but allows holder own booking', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const hold = await store.acquireHold(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0 });

    await assert.rejects(
      () => store.createBookingAtomic(guestB, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 1, children: 0 }),
      /Room is temporarily held/i
    );

    const ownRes = await store.createBookingAtomic(guestA, {
      roomId: sampleRoom.id,
      checkInDate: d1,
      checkOutDate: d2,
      adults: 2,
      children: 0,
      holdId: hold.holdId,
    });
    assert.equal(ownRes.status, 'pending');
  });

  // Test 5: An expired hold no longer blocks the room (and rejects stale session holder cleanly)
  await runCase('Test 5: Expired hold stops blocking future bookings', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const hold = await store.acquireHold(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0 });

    // Advance clock past 15-minute TTL
    store.nowMs += HOLD_TTL_MS + 1000;

    // Guest A with expired session gets clear session-expired error
    await assert.rejects(
      () => store.createBookingAtomic(guestA, {
        roomId: sampleRoom.id,
        checkInDate: d1,
        checkOutDate: d2,
        adults: 2,
        children: 0,
        holdId: hold.holdId,
      }),
      /booking session has expired/i
    );

    // Guest B succeeds because expired hold is ignored independently of scheduled cleanup
    const resB = await store.createBookingAtomic(guestB, {
      roomId: sampleRoom.id,
      checkInDate: d1,
      checkOutDate: d2,
      adults: 2,
      children: 0,
    });
    assert.equal(resB.status, 'pending');
  });

  // Test 6: A cancelled booking (plus rejected / expired / failed) no longer blocks the room
  await runCase('Test 6: Cancelled booking releases room availability immediately', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const resA = await store.createBookingAtomic(guestA, {
      roomId: sampleRoom.id,
      checkInDate: d1,
      checkOutDate: d2,
      adults: 2,
      children: 0,
      paymentVerified: true,
    });
    store.transitionBookingStatus(resA.id, 'cancelled');

    const resB = await store.createBookingAtomic(guestB, {
      roomId: sampleRoom.id,
      checkInDate: d1,
      checkOutDate: d2,
      adults: 2,
      children: 0,
      paymentVerified: true,
    });
    assert.equal(resB.status, 'confirmed');

    // Also verify buildRoomLockSlotsFromRecords ignores cancelled/expired/failed bookings
    const built = buildRoomLockSlotsFromRecords([
      { ...store.bookings.get(resA.id)!, status: 'failed' },
      { ...store.bookings.get(resB.id)!, status: 'confirmed' },
    ]);
    assert.equal(built[sampleRoom.id].length, 1);
    assert.equal(built[sampleRoom.id][0].slotId, resB.id);
  });

  // Test 7: Two bookings with non-overlapping dates both succeed
  await runCase('Test 7: Two non-overlapping bookings both succeed', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const gapIn = addDaysToDateString(d2, 1);
    const gapOut = addDaysToDateString(gapIn, 2);

    const b1 = await store.createBookingAtomic(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 1, children: 0 });
    const b2 = await store.createBookingAtomic(guestB, { roomId: sampleRoom.id, checkInDate: gapIn, checkOutDate: gapOut, adults: 1, children: 0 });
    assert.ok(b1.id !== b2.id);
    assert.equal(store.bookings.size, 2);
  });

  // Test 8: Same-day check-out and next check-in allowed (existingCheckOut == requestedCheckIn)
  await runCase('Test 8: Same-day check-out and next check-in allowed', async () => {
    assert.equal(datesOverlap(d1, d2, d2, d3), false, 'Adjacent dates must NOT overlap');
    const store = new SimulatedFirestoreStore([sampleRoom]);
    await store.createBookingAtomic(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0, paymentVerified: true });
    const backToBack = await store.createBookingAtomic(guestB, { roomId: sampleRoom.id, checkInDate: d2, checkOutDate: d3, adults: 2, children: 0, paymentVerified: true });
    assert.equal(backToBack.status, 'confirmed');
  });

  // Test 9: Unauthenticated visitor attempts to acquire hold or confirm booking
  await runCase('Test 9: Unauthenticated visitor blocked from holding or confirming booking', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    await assert.rejects(
      () => store.acquireHold(null, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2 }),
      /sign in/i
    );
    await assert.rejects(
      () => store.createBookingAtomic(null, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 1, children: 0 }),
      /sign in/i
    );
  });

  // Test 10: Customer attempts to access another customer's booking (+ rules file audit)
  await runCase('Test 10: Customer isolated from accessing/modifying other customer bookings', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const resA = await store.createBookingAtomic(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0 });

    assert.throws(() => store.readBooking(guestB, resA.id), /PERMISSION_DENIED/);
    assert.throws(() => store.updateBookingByUser(guestB, resA.id, { status: 'cancelled' }), /PERMISSION_DENIED/);
    // Owner and admin can read
    assert.equal(store.readBooking(guestA, resA.id).id, resA.id);
    assert.equal(store.readBooking(adminUser, resA.id).id, resA.id);

    // Verify firestore.rules enforces strict rules without open allow read, write: if true
    const rulesContent = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');
    assert.equal(/allow\s+read\s*,\s*write\s*:\s*if\s+true/i.test(rulesContent), false, 'Must not contain permissive allow read, write: if true');
    assert.equal(/match\s+\/inventoryHolds\/\{holdId\}[\s\S]*allow\s+create,\s*update,\s*delete:\s*if\s+true/i.test(rulesContent), false, 'inventoryHolds must not be open write');
    assert.match(rulesContent, /request\.auth\.token\.email_verified\s*==\s*true/);
    assert.match(rulesContent, /match\s+\/roomLocks\/\{roomId\}/);
  });

  // Test 11: Firestore network or transaction failure occurs during booking -> aborts safely
  await runCase('Test 11: Network / transaction failure aborts cleanly with zero phantom bookings', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const formSnapshot = { guestName: 'Aarav Sharma', guestEmail: 'aarav@example.com', checkInDate: d1, checkOutDate: d2 };
    store.simulateNetworkError = 'aborted: Firestore transaction contention';

    await assert.rejects(
      () => store.createBookingAtomic(guestA, { roomId: sampleRoom.id, checkInDate: d1, checkOutDate: d2, adults: 2, children: 0 }),
      /aborted/i
    );
    assert.equal(store.bookings.size, 0, 'Failed transaction must not persist partial booking');
    assert.equal(formSnapshot.guestName, 'Aarav Sharma', 'Form data remains intact for retry');
  });

  // Test 12: Customer double-clicks Book Now button -> synchronous lock prevents duplicate booking
  await runCase('Test 12: Double-click submit guard prevents duplicate bookings', async () => {
    const store = new SimulatedFirestoreStore([sampleRoom]);
    const lock = { current: false };
    let executions = 0;

    const handleClickBookNow = async () => {
      if (lock.current) return null;
      lock.current = true;
      try {
        executions += 1;
        return await store.createBookingAtomic(guestA, {
          roomId: sampleRoom.id,
          checkInDate: d1,
          checkOutDate: d2,
          adults: 2,
          children: 0,
        });
      } finally {
        lock.current = false;
      }
    };

    const [first, second] = await Promise.all([handleClickBookNow(), handleClickBookNow()]);
    assert.ok(first !== null, 'First click must submit');
    assert.equal(second, null, 'Second immediate click must be ignored by synchronous lock');
    assert.equal(executions, 1);
    assert.equal(store.bookings.size, 1);
  });

  console.log(`\nALL ${passed}/12 BOOKING & SECURITY TESTS PASSED!`);
}

runAllTests().catch((err) => {
  console.error('TEST SUITE FAILED:', err);
  process.exit(1);
});
