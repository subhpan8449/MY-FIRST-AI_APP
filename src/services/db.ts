import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { awardPointsForBooking } from './loyaltyService';
import {
  HOLD_TTL_MS,
  NON_BLOCKING_BOOKING_STATUSES,
  buildRoomLockSlotsFromRecords,
  calculateNights,
  evaluateRoomAvailability,
  isValidStatusTransition,
  pruneExpiredHoldSlots,
  validateBookingRequest,
  type AvailabilityCheckResult,
} from '../utils/bookingAvailability';
import {
  Room,
  Facility,
  Offer,
  Booking,
  BookingStatus,
  InventoryHold,
  RoomLock,
  RoomLockSlot,
  PlayAreaSettings,
  PlayAreaBooking,
  RooftopPackage,
  RooftopBooking,
  Expense,
  BusinessSettings,
  AdminAuditLog,
  NotificationItem,
  ContactEnquiry,
  AIInsight,
  CustomerServiceRequest,
  CustomerServiceCategory,
  ServiceRequestStatus,
  ServicePriority,
  HousekeepingTask,
  StaffMember,
  RoomPricingHistory,
  PriceType,
  CustomerFeedback,
  Room3DConfig,
  ProposedBookingChanges,
  BookingHistoryItem,
  GameRewardTier,
  UserGameProgress,
  GameRewardVoucher,
  GuestIdDocument
} from '../types';

export class BookingDomainError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'BookingDomainError';
    this.code = code;
  }
}

/**
 * Recursively removes undefined fields from an object so Firestore operations never throw:
 * "Unsupported field value: undefined"
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as unknown as T;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString() as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const [k, v] of Object.entries(val as Record<string, any>)) {
    if (v !== undefined) {
      cleanObj[k] = sanitizeForFirestore(v);
    }
  }
  return cleanObj as T;
}

/**
 * Safely writes an admin audit log, ensuring all details are sanitized and non-critical failures
 * never interrupt primary user transactions.
 */
export async function logAdminAudit(
  action: string,
  performedBy: string,
  targetCollection: string,
  targetId: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const cleanDetails = sanitizeForFirestore(details || {});
    await addDoc(collection(db, 'adminAuditLogs'), {
      action,
      performedBy: performedBy || 'admin@devashishhomestay.com',
      targetCollection,
      targetId,
      details: cleanDetails,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Non-blocking: Failed to record admin audit log:', err);
  }
}

// ==========================================
// SEED DATA FOR FIRST BOOTSTRAP
// ==========================================

const INITIAL_ROOMS: Omit<Room, 'id'>[] = [
  {
    roomNumber: '101',
    name: 'Budget Standard Room',
    category: 'Budget Standard Room',
    description: 'Cozy and clean ground-floor room bathed in soft natural daylight. Ideal for solo travelers, backpackers, and budget-conscious guests.',
    floor: 'Ground Floor',
    viewType: 'garden',
    beds: 1,
    bedType: 'Queen Bed',
    adultCapacity: 2,
    childCapacity: 1,
    totalCapacity: 3,
    amenities: ['Free High-Speed Wi-Fi', 'Ensuite Bathroom', 'Hot Shower 24/7', 'Electric Kettle', 'Ceiling Fan'],
    images: [
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 799,
    specialPrice: 799,
    studentPrice: 599,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '102',
    name: 'Budget Double Room',
    category: 'Budget Double Room',
    description: 'Comfortable ground-floor double room overlooking lush courtyard greenery. Ideal for traveling duos, pilgrims, and peaceful retreats in Tapovan.',
    floor: 'Ground Floor',
    viewType: 'garden',
    beds: 1,
    bedType: 'Queen Bed',
    adultCapacity: 2,
    childCapacity: 1,
    totalCapacity: 3,
    amenities: ['Free High-Speed Wi-Fi', 'Work Desk & Chair', 'Ensuite Bathroom', 'Electric Kettle', 'Luggage Rack'],
    images: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 999,
    specialPrice: 999,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '103',
    name: 'Deluxe Room',
    category: 'Deluxe Room',
    description: 'Spacious first-floor room with private mountain air exposure, wooden furnishings, warm mood lighting, and modern attached bathroom.',
    floor: '1st Floor',
    viewType: 'hill',
    beds: 1,
    bedType: 'King Bed',
    adultCapacity: 2,
    childCapacity: 1,
    totalCapacity: 3,
    amenities: ['Private Balcony Nook', 'Mountain Air', 'Free High-Speed Wi-Fi', 'Smart TV', 'Hot Shower 24/7', 'Tea Maker'],
    images: [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 1199,
    specialPrice: 1199,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '104',
    name: 'Family Room',
    category: 'Family Room',
    description: 'Large family-oriented room equipped with generous space, two beds, pool privileges included, and play-area access for traveling families.',
    floor: '1st Floor',
    viewType: 'hill',
    beds: 2,
    bedType: '1 King + 1 Single Bed',
    adultCapacity: 3,
    childCapacity: 2,
    totalCapacity: 5,
    amenities: ['Family Seating', 'Free High-Speed Wi-Fi', 'Mini Fridge', 'Private Bathroom', 'Kids Toy Box on Request'],
    images: [
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 1399,
    specialPrice: 1399,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '201',
    name: 'Couple Special Room',
    category: 'Couple Special Room',
    description: 'Charming sunlit room with romantic decor, private balcony seating overlooking Tapovan greenery, and tea-making facilities.',
    floor: '2nd Floor',
    viewType: 'hill',
    beds: 1,
    bedType: 'King Bed',
    adultCapacity: 2,
    childCapacity: 0,
    totalCapacity: 2,
    amenities: ['Private Balcony', 'Romantic Warm Lighting', 'Free High-Speed Wi-Fi', 'Tea/Coffee Maker', 'Mountain View'],
    images: [
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 1099,
    specialPrice: 1099,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '202',
    name: 'Student Budget Room',
    category: 'Student Budget Room',
    description: 'Affordable, serene room featuring high-speed optical Wi-Fi and ergonomic study desk for yoga teacher training trainees and college students. Subject to student ID verification.',
    floor: '2nd Floor',
    viewType: 'standard',
    beds: 1,
    bedType: 'Single Bed',
    adultCapacity: 1,
    childCapacity: 0,
    totalCapacity: 1,
    amenities: ['Dedicated Study Desk & Chair', 'High-Speed Wi-Fi', 'Hot Shower 24/7', 'Power Outlets at Desk', 'Clean Linens'],
    images: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 599,
    specialPrice: 599,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '203',
    name: 'City View Room',
    category: 'City View Room',
    description: 'Bright elevated room on the second floor offering wide window vistas towards Tapovan town and Rishikesh hills.',
    floor: '2nd Floor',
    viewType: 'city',
    beds: 1,
    bedType: 'Queen Bed',
    adultCapacity: 2,
    childCapacity: 1,
    totalCapacity: 3,
    amenities: ['Town & Hill Vista', 'Balcony Access', 'Free Wi-Fi', 'Ensuite Bathroom', 'Electric Kettle'],
    images: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 1299,
    specialPrice: 1299,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '301',
    name: 'Top Floor City View Room',
    category: 'Top Floor City View Room',
    description: 'Premier top-floor room with commanding panoramic views of Rishikesh city lights, foothill ridges, and direct access to the rooftop terrace.',
    floor: 'Top Floor (3rd)',
    viewType: 'city',
    beds: 1,
    bedType: 'King Bed',
    adultCapacity: 2,
    childCapacity: 1,
    totalCapacity: 3,
    amenities: ['Panoramic City View', 'Top Floor Stargazing Access', 'Private Balcony', 'High-Speed Wi-Fi', 'Tea Bar'],
    images: [
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 1499,
    specialPrice: 1499,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '302',
    name: 'Long Stay Budget Room',
    category: 'Long Stay Budget Room',
    description: 'Tailored for extended stays of 7+ nights. Includes generous wardrobe storage, workstation nook, and weekly laundry/linen refresh privileges.',
    floor: 'Top Floor (3rd)',
    viewType: 'garden',
    beds: 1,
    bedType: 'Queen Bed',
    adultCapacity: 2,
    childCapacity: 1,
    totalCapacity: 3,
    amenities: ['Storage Wardrobe', 'Workstation', 'Free Wi-Fi', 'Weekly Linen Refresh', 'Laundry Rack'],
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 699,
    specialPrice: 699,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  },
  {
    roomNumber: '303',
    name: 'Premium Family Room',
    category: 'Premium Family Room',
    description: 'Our most spacious family retreat featuring two large beds, seating lounge, mountain sunshine, and complimentary pool and kids play area access.',
    floor: 'Top Floor (3rd)',
    viewType: 'hill',
    beds: 2,
    bedType: '1 King + 1 Queen Bed',
    adultCapacity: 4,
    childCapacity: 2,
    totalCapacity: 6,
    amenities: ['Panoramic Hill Vistas', 'Lounge Seating', 'Free Pool Access', 'Kids Play Area Access', 'Free Wi-Fi'],
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'
    ],
    basePrice: 1599,
    specialPrice: 1599,
    isActive: true,
    isMaintenance: false,
    availabilityStatus: 'available'
  }
];

const INITIAL_FACILITIES: Omit<Facility, 'id'>[] = [
  {
    name: 'Outdoor Leisure Swimming Pool',
    description: 'Clean, sparkling freshwater pool available for all staying guests at no additional charge. Perfect for refreshing after a day of rafting or temple visits.',
    category: 'Recreation',
    timings: '7:00 AM – 7:30 PM Daily (Maintenance break: 1:00 PM – 2:30 PM)',
    rules: [
      'Pool access is free and included with room booking',
      'Appropriate swimwear required at all times',
      'Children under 14 must be accompanied by an adult guardian at all times',
      'No glassware or food inside the pool basin',
      'Please shower before entering the pool'
    ],
    includedInBooking: true,
    isActive: true,
    icon: 'Waves'
  },
  {
    name: "Children's Play Area & Activity Zone",
    description: 'Dedicated indoor and shaded play area equipped with child-safe soft play mats, mini slide, drawing tables, and educational board games.',
    category: 'Family & Kids',
    timings: 'Morning: 8:00 AM - 12:00 PM | Afternoon: 3:00 PM - 6:00 PM | Evening: 6:00 PM - 8:00 PM',
    rules: [
      'Free for staying guests with prior slot confirmation',
      'Children must be supervised by parents or guardians at all times (no daycare provided)',
      'Ages 2 to 12 years eligible',
      'Shoes must be placed on the shoe rack outside the play area'
    ],
    includedInBooking: true,
    isActive: true,
    icon: 'Baby'
  },
  {
    name: 'Top Floor City-View Terrace',
    description: 'Open-air rooftop terrace on the 3rd floor providing panoramic vistas of Rishikesh town, surrounding Himalayan foothills, and evening sunsets.',
    category: 'View & Relaxation',
    timings: '6:00 AM – 10:00 PM',
    rules: [
      'Open to all homestay guests for yoga, reading, and relaxation',
      'Private date or dinner setups require advance package reservation',
      'Quiet hours begin at 9:30 PM'
    ],
    includedInBooking: true,
    isActive: true,
    icon: 'Eye'
  },
  {
    name: 'High-Speed Optical Fiber Wi-Fi',
    description: 'Reliable fiber broadband coverage across all rooms, balconies, and common areas. Tested for video conferencing and remote work.',
    category: 'Connectivity',
    timings: '24/7 Uncapped',
    rules: ['Free for all guests', 'Password provided at check-in'],
    includedInBooking: true,
    isActive: true,
    icon: 'Wifi'
  },
  {
    name: '24/7 Power Backup & Solar Hot Water',
    description: 'Continuous power inverter backup and dedicated water heating so your stay in Tapovan is never interrupted.',
    category: 'Utility',
    timings: '24 Hours',
    rules: ['Inverter powers lighting, fans, and Wi-Fi during local power outages'],
    includedInBooking: true,
    isActive: true,
    icon: 'Zap'
  }
];

const INITIAL_OFFERS: Omit<Offer, 'id'>[] = [
  {
    name: 'Student & Solo Explorer Special',
    code: 'STUDENT500',
    discountType: 'fixed',
    discountValue: 500,
    minStay: 1,
    maxDiscount: 500,
    eligibleCategories: ['Budget Studio', 'Standard Room', 'Budget Economy'],
    requiresIdVerification: true,
    isActive: true,
    description: 'Get an instant ₹500 flat discount per booking. Valid student ID required upon check-in.'
  },
  {
    name: 'Long-Stay Himalayan Explorer (7+ Nights)',
    code: 'LONGSTAY20',
    discountType: 'percentage',
    discountValue: 20,
    minStay: 7,
    maxDiscount: 5000,
    eligibleCategories: ['Deluxe Balcony', 'City View Deluxe', 'Long-Stay Suite', 'Family Suite'],
    requiresIdVerification: false,
    isActive: true,
    description: 'Enjoy 20% off your entire stay for bookings of 7 nights or longer. Great for yoga practitioners.'
  },
  {
    name: 'Couple Tapovan Getaway',
    code: 'SUNLITCOUPLE',
    discountType: 'percentage',
    discountValue: 12,
    minStay: 2,
    maxDiscount: 1000,
    eligibleCategories: ['Deluxe Balcony', 'City View Deluxe', 'City View Premium'],
    requiresIdVerification: false,
    isActive: true,
    description: '12% discount for 2+ nights stay in our sunlit balcony and city view rooms.'
  },
  {
    name: 'Char Dham Pilgrim & Senior Citizen Special',
    code: 'PILGRIM10',
    discountType: 'percentage',
    discountValue: 10,
    minStay: 1,
    maxDiscount: 800,
    eligibleCategories: ['Standard Room', 'Family Suite', 'Budget Studio'],
    requiresIdVerification: true,
    isActive: true,
    description: '10% discount for registered pilgrims and senior citizens visiting holy shrines in Uttarakhand.'
  }
];

const INITIAL_PLAY_AREA_SETTINGS: PlayAreaSettings = {
  id: 'current',
  morningSession: '8:00 AM – 12:00 PM',
  afternoonSession: '3:00 PM – 6:00 PM',
  eveningSession: '6:00 PM – 8:00 PM',
  slotDurationMinutes: 60,
  maxChildrenPerSlot: 8,
  minAge: 2,
  maxAge: 12,
  rules: [
    'Parents or guardians remain strictly responsible for children’s supervision at all times.',
    'Devashish Sunlit Homestay provides play facilities but not professional childcare or babysitting.',
    'Children must wear socks inside the soft-floor activity zone.',
    'No food, chewing gum, or sugary drinks inside the play equipment area.'
  ],
  isClosed: false,
  closureReason: ''
};

const INITIAL_ROOFTOP_PACKAGES: Omit<RooftopPackage, 'id'>[] = [
  {
    name: 'Private City-View Sunset Dinner Setup',
    description: 'Exclusive evening access to the decorated city-view terrace section with fairy lights, floral candle setting, and panoramic twilight views.',
    price: 1800,
    capacity: 2,
    durationHours: 3,
    availableSlots: ['6:00 PM – 9:00 PM', '7:30 PM – 10:30 PM'],
    inclusions: [
      'Private decorated table with ambient lanterns & flowers',
      'Panoramic sunset & city lights view',
      'Bluetooth speaker for gentle background music',
      'Dedicated service support (Food ordered via CookNow or homestay arrangement)'
    ],
    conditions: [
      'Advance reservation of at least 6 hours required',
      'Subject to weather conditions (sheltered backup available on terrace)',
      'Quiet music rules enforced after 9:30 PM'
    ],
    isActive: true
  },
  {
    name: 'Birthday & Anniversary Celebration Deck',
    description: 'Festive balloon and ribbon setup for family celebrations, milestones, and special anniversaries on our top floor terrace.',
    price: 2500,
    capacity: 6,
    durationHours: 3,
    availableSlots: ['4:00 PM – 7:00 PM', '7:00 PM – 10:00 PM'],
    inclusions: [
      'Celebration banner and color-themed balloons',
      'Cake table and decorative photo corner',
      'Cutlery and seating setup for up to 6 guests',
      'Homestay host coordination'
    ],
    conditions: [
      'No firecrackers or open flames allowed',
      'Cake and special menu items arranged separately through CookNow partner'
    ],
    isActive: true
  },
  {
    name: 'Morning Himalayan Meditation & Tea Hour',
    description: 'Quiet early morning setup with fresh herbal chai and yoga mats overlooking the waking city and mountain ridge.',
    price: 600,
    capacity: 4,
    durationHours: 2,
    availableSlots: ['6:30 AM – 8:30 AM'],
    inclusions: [
      'Yoga mats & meditation cushions provided',
      'Pot of organic ginger tulsi chai with local biscuits',
      'Uninterrupted sunrise serenity'
    ],
    conditions: ['Silence and mindful decorum observed'],
    isActive: true
  }
];

// ==========================================
// BOOTSTRAP INITIAL COLLECTIONS
// ==========================================

export async function bootstrapInitialData(): Promise<void> {
  try {
    // 1. Check if rooms exist
    const roomsSnap = await getDocs(collection(db, 'rooms'));
    if (roomsSnap.empty) {
      console.log('Bootstrapping initial rooms...');
      for (const room of INITIAL_ROOMS) {
        await addDoc(collection(db, 'rooms'), {
          ...room,
          createdAt: new Date().toISOString()
        });
      }
    } else {
      for (const docSnap of roomsSnap.docs) {
        const data = docSnap.data() as Room;
        const matchingInit = INITIAL_ROOMS.find(r => r.roomNumber === data.roomNumber);
        if (matchingInit && (!data.images || data.images.length === 0 || (data.images.length === 1 && data.images[0] === matchingInit.images[0]))) {
          await updateDoc(docSnap.ref, {
            images: matchingInit.images,
            name: matchingInit.name,
            category: matchingInit.category
          });
        }
      }
    }

    // 2. Check facilities
    const facSnap = await getDocs(collection(db, 'facilities'));
    if (facSnap.empty) {
      console.log('Bootstrapping initial facilities...');
      for (const fac of INITIAL_FACILITIES) {
        await addDoc(collection(db, 'facilities'), fac);
      }
    }

    // 3. Check offers
    const offersSnap = await getDocs(collection(db, 'offers'));
    if (offersSnap.empty) {
      console.log('Bootstrapping initial offers...');
      for (const off of INITIAL_OFFERS) {
        await addDoc(collection(db, 'offers'), off);
      }
    }

    // 4. Check play area settings
    const playAreaRef = doc(db, 'playAreaSettings', 'current');
    const playAreaSnap = await getDoc(playAreaRef);
    if (!playAreaSnap.exists()) {
      await setDoc(playAreaRef, INITIAL_PLAY_AREA_SETTINGS);
    }

    // 5. Check rooftop packages
    const rooftopSnap = await getDocs(collection(db, 'rooftopPackages'));
    if (rooftopSnap.empty) {
      for (const pkg of INITIAL_ROOFTOP_PACKAGES) {
        await addDoc(collection(db, 'rooftopPackages'), pkg);
      }
    }

    // 6. Check business settings
    const businessRef = doc(db, 'businessSettings', 'profile');
    const businessSnap = await getDoc(businessRef);
    if (!businessSnap.exists()) {
      const defaultSettings: BusinessSettings = {
        id: 'profile',
        businessName: 'Devashish Sunlit Homestay',
        location: 'Tapovan, Rishikesh, Uttarakhand, India (Near Laxman Jhula bypass)',
        phone: '9897335265',
        email: 'subhpan8449@gmail.com',
        checkInTime: '12:00 PM',
        checkOutTime: '11:00 AM',
        allowPayAtProperty: true,
        publicAdminContact: false,
        updatedAt: new Date().toISOString()
      };
      await setDoc(businessRef, defaultSettings);
    }

    // 7. Check staff members
    const staffSnap = await getDocs(collection(db, 'staffMembers'));
    if (staffSnap.empty) {
      const initialStaff = [
        {
          name: 'Ramesh Rawat',
          phone: '+91 9897112233',
          email: 'ramesh.rawat@devashish.in',
          designation: 'Housekeeping' as const,
          active: true,
          responsibilities: ['Room turnover', 'Linen changing', 'Bathroom sanitization', 'Floor cleaning'],
          completedTasksCount: 142,
          createdAt: new Date().toISOString()
        },
        {
          name: 'Sunita Joshi',
          phone: '+91 9412334455',
          email: 'sunita.joshi@devashish.in',
          designation: 'Reception' as const,
          active: true,
          responsibilities: ['Guest check-in', 'ID verification', 'Service desk coordination', 'Keys'],
          completedTasksCount: 215,
          createdAt: new Date().toISOString()
        },
        {
          name: 'Amit Semwal',
          phone: '+91 9897887766',
          email: 'amit.semwal@devashish.in',
          designation: 'Maintenance' as const,
          active: true,
          responsibilities: ['Electrical backup', 'Solar geysers', 'Plumbing', 'Wi-Fi fiber troubleshooting'],
          completedTasksCount: 88,
          createdAt: new Date().toISOString()
        },
        {
          name: 'Manoj Pandey',
          phone: '+91 9897335265',
          email: 'manoj.pandey@devashish.in',
          designation: 'Supervisor' as const,
          active: true,
          responsibilities: ['Housekeeping inspection', 'Inventory auditing', 'Shift supervision'],
          completedTasksCount: 310,
          createdAt: new Date().toISOString()
        }
      ];
      for (const s of initialStaff) {
        await addDoc(collection(db, 'staffMembers'), s);
      }
    }

    // 8. Check housekeeping tasks
    const hkSnap = await getDocs(collection(db, 'housekeepingTasks'));
    if (hkSnap.empty) {
      const initialTasks = [
        {
          roomNumber: '101',
          taskType: 'routine_cleaning' as const,
          priority: 'medium' as const,
          deadline: '11:30 AM Today',
          status: 'completed' as const,
          assignedStaffName: 'Ramesh Rawat',
          notes: 'Daily sweep, fresh towel supply, electric kettle decalcified.',
          inspectionPassed: true,
          inspectedBy: 'Manoj Pandey',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          completedAt: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          roomNumber: '201',
          taskType: 'deep_clean' as const,
          priority: 'high' as const,
          deadline: '2:00 PM Today',
          status: 'in_progress' as const,
          assignedStaffName: 'Ramesh Rawat',
          notes: 'Balcony glass polish and sun lounger wash before couple check-in.',
          inspectionPassed: false,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
          roomNumber: '301',
          taskType: 'inspection' as const,
          priority: 'urgent' as const,
          deadline: '1:00 PM Today',
          status: 'pending' as const,
          notes: 'Top floor city view panoramic window inspection and tea bar replenishment.',
          inspectionPassed: false,
          createdAt: new Date().toISOString()
        }
      ];
      for (const t of initialTasks) {
        await addDoc(collection(db, 'housekeepingTasks'), t);
      }
    }

    // 9. Check customer feedback
    const fbSnap = await getDocs(collection(db, 'customerFeedback'));
    if (fbSnap.empty) {
      const initialFeedback = [
        {
          bookingReference: 'DSH-20261015-4421',
          guestName: 'Ananya Deshmukh',
          roomNumber: '201',
          rating: 5,
          category: 'stay' as const,
          comments: 'The sunlit balcony room was exceptionally clean and peaceful. Enjoyed morning tea with cool breeze. The kids loved the play area!',
          responseByOwner: 'Thank you Ananya ji! Looking forward to welcoming your family again in Tapovan.',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
        },
        {
          bookingReference: 'DSH-20261018-8812',
          guestName: 'Rohan Mehta',
          roomNumber: '301',
          rating: 5,
          category: 'rooftop' as const,
          comments: 'The panoramic city view from the 3rd floor at dusk was unforgettable. Sunset dinner setup on the terrace was done with great care.',
          responseByOwner: 'Glad you enjoyed the rooftop setup Rohan! Safe travels.',
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        },
        {
          bookingReference: 'DSH-20261022-3190',
          guestName: 'Vikramaditya Rao',
          roomNumber: '103',
          rating: 5,
          category: 'service' as const,
          comments: 'Affordable student rates with fast optical Wi-Fi for my remote study sessions. Staff was warm and attentive.',
          createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
        }
      ];
      for (const fb of initialFeedback) {
        await addDoc(collection(db, 'customerFeedback'), fb);
      }
    }
  } catch (err) {
    console.warn('Bootstrap note (safe if permissions restrict unauthenticated writes):', err);
  }
}

// ==========================================
// ROOMS CRUD & AVAILABILITY
// ==========================================

export async function getRooms(): Promise<Room[]> {
  try {
    const snap = await getDocs(collection(db, 'rooms'));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'rooms');
  }
}

export async function addRoom(roomData: Omit<Room, 'id'>, adminEmail?: string): Promise<string> {
  try {
    const cleanRoom = sanitizeForFirestore(roomData);
    const res = await addDoc(collection(db, 'rooms'), {
      ...cleanRoom,
      createdAt: new Date().toISOString()
    });

    if (adminEmail) {
      await logAdminAudit(
        `Added room ${roomData.roomNumber} (${roomData.name})`,
        adminEmail,
        'rooms',
        res.id,
        cleanRoom
      );
    }

    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'rooms');
  }
}

export async function updateRoom(roomId: string, data: Partial<Room>, adminEmail?: string): Promise<void> {
  try {
    const cleanData = sanitizeForFirestore(data);
    const ref = doc(db, 'rooms', roomId);
    await updateDoc(ref, {
      ...cleanData,
      updatedAt: new Date().toISOString()
    });

    if (adminEmail) {
      await logAdminAudit(
        `Updated room ${roomId}`,
        adminEmail,
        'rooms',
        roomId,
        cleanData
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
  }
}

export async function deleteRoom(roomId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'rooms', roomId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `rooms/${roomId}`);
  }
}

// Internal helper to read active PII-free lock slots for a room
async function getRoomLockSlots(roomId: string): Promise<RoomLockSlot[]> {
  const nowMs = Date.now();
  const slots: RoomLockSlot[] = [];
  try {
    const lockSnap = await getDoc(doc(db, 'roomLocks', roomId));
    if (lockSnap.exists()) {
      const data = lockSnap.data() as RoomLock;
      if (Array.isArray(data.slots)) {
        slots.push(...pruneExpiredHoldSlots(data.slots, nowMs));
      }
    }
  } catch (err) {
    console.warn('Could not read roomLocks document:', err);
  }
  return slots;
}

/**
 * Checks room availability using PII-free roomLocks/{roomId}, rooms/{roomId},
 * validation of past dates & same-day check-out turnover, and ignores expired holds & cancelled bookings.
 */
export async function checkRoomAvailabilityDetailed(
  roomId: string,
  checkIn: string,
  checkOut: string,
  options?: {
    requestingUserId?: string | null;
    adults?: number;
    children?: number;
    room?: Room | null;
    excludeBookingId?: string;
  }
): Promise<AvailabilityCheckResult> {
  try {
    let targetRoom = options?.room || null;
    if (!targetRoom) {
      const roomSnap = await getDoc(doc(db, 'rooms', roomId));
      if (roomSnap.exists()) {
        targetRoom = { id: roomSnap.id, ...roomSnap.data() } as Room;
      }
    }

    const slots = await getRoomLockSlots(roomId);
    return evaluateRoomAvailability({
      slots,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      requestingUserId: options?.requestingUserId ?? auth.currentUser?.uid ?? null,
      room: targetRoom,
      adults: options?.adults,
      children: options?.children,
      excludeBookingId: options?.excludeBookingId,
      nowMs: Date.now(),
    });
  } catch (error) {
    console.error('Error evaluating room availability:', error);
    return {
      available: false,
      status: 'invalid_dates',
      message: 'Unable to verify room availability right now. Please try again.',
    };
  }
}

// Backwards-compatible boolean availability helper
export async function checkRoomAvailability(
  roomId: string,
  checkIn: string,
  checkOut: string,
  requestingUserId?: string
): Promise<boolean> {
  const result = await checkRoomAvailabilityDetailed(roomId, checkIn, checkOut, {
    requestingUserId,
  });
  return result.available;
}

// ==========================================
// INVENTORY HOLDS (PERSISTENT + TRANSACTIONAL)
// ==========================================

export async function acquireOrRefreshInventoryHold(params: {
  roomId: string;
  roomName?: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  existingHoldId?: string | null;
}): Promise<{ holdId: string; expiresAt: number; expiresInMinutes: number }> {
  const user = auth.currentUser;
  if (!user) {
    throw new BookingDomainError('unauthenticated', 'Please sign in with Google before holding or booking a room.');
  }

  try {
    return await runTransaction(db, async (tx) => {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const roomRef = doc(db, 'rooms', params.roomId);
      const lockRef = doc(db, 'roomLocks', params.roomId);

      const roomSnap = await tx.get(roomRef);
      const lockSnap = await tx.get(lockRef);

      const room = roomSnap.exists() ? ({ id: roomSnap.id, ...roomSnap.data() } as Room) : null;
      const existingSlots = lockSnap.exists() && Array.isArray((lockSnap.data() as RoomLock).slots)
        ? (lockSnap.data() as RoomLock).slots
        : [];

      const availability = evaluateRoomAvailability({
        slots: existingSlots,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        requestingUserId: user.uid,
        room,
        adults: params.adults,
        children: params.children,
        nowMs,
      });

      if (!availability.available) {
        throw new BookingDomainError(availability.status, availability.message);
      }

      // Clean expired holds and replace any previous hold by this same user on this room
      const prunedSlots = pruneExpiredHoldSlots(existingSlots, nowMs).filter(
        (s) => !(s.kind === 'hold' && s.userId === user.uid)
      );

      const holdId =
        params.existingHoldId && /^[a-zA-Z0-9_-]{6,80}$/.test(params.existingHoldId)
          ? params.existingHoldId
          : `hold_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
      const expiresAtMs = nowMs + HOLD_TTL_MS;
      const expiresAtIso = new Date(expiresAtMs).toISOString();

      const newHoldSlot: RoomLockSlot = {
        slotId: holdId,
        kind: 'hold',
        userId: user.uid,
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        status: 'held',
        expiresAtMs,
        updatedAt: nowIso,
      };

      const holdDocRef = doc(db, 'inventoryHolds', holdId);
      const holdRecord: Record<string, any> = sanitizeForFirestore({
        id: holdId,
        holdId,
        roomId: params.roomId,
        roomName: params.roomName || room?.name || `Room ${params.roomId}`,
        userId: user.uid,
        guestEmail: user.email || '',
        checkInDate: params.checkInDate,
        checkOutDate: params.checkOutDate,
        status: 'held',
        expiresAtMs,
        expiresAt: expiresAtIso,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      tx.set(holdDocRef, { ...holdRecord, serverCreatedAt: serverTimestamp() }, { merge: true });
      tx.set(
        lockRef,
        {
          roomId: params.roomId,
          slots: [...prunedSlots, newHoldSlot],
          updatedAt: nowIso,
        },
        { merge: true }
      );

      return {
        holdId,
        expiresAt: expiresAtMs,
        expiresInMinutes: 15,
      };
    });
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.WRITE, `inventoryHolds/${params.roomId}`);
  }
}

export async function releaseInventoryHoldRecord(
  holdId: string,
  roomIdHint?: string,
  targetStatus: 'released' | 'expired' = 'released'
): Promise<void> {
  if (!holdId) return;
  const user = auth.currentUser;
  if (!user) return;

  try {
    await runTransaction(db, async (tx) => {
      const holdRef = doc(db, 'inventoryHolds', holdId);
      const holdSnap = await tx.get(holdRef);
      const resolvedRoomId = roomIdHint || (holdSnap.exists() ? (holdSnap.data() as InventoryHold).roomId : undefined);
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      if (resolvedRoomId) {
        const lockRef = doc(db, 'roomLocks', resolvedRoomId);
        const lockSnap = await tx.get(lockRef);
        if (lockSnap.exists()) {
          const existingSlots = Array.isArray((lockSnap.data() as RoomLock).slots)
            ? (lockSnap.data() as RoomLock).slots
            : [];
          const nextSlots = pruneExpiredHoldSlots(existingSlots, nowMs).filter((s) => s.slotId !== holdId);
          tx.set(lockRef, { roomId: resolvedRoomId, slots: nextSlots, updatedAt: nowIso }, { merge: true });
        }
      }

      if (holdSnap.exists()) {
        const currentHold = holdSnap.data() as InventoryHold;
        if (currentHold.status === 'held') {
          tx.update(holdRef, {
            status: targetStatus,
            releasedAt: nowIso,
            releasedBy: user.email || user.uid,
            updatedAt: nowIso,
          });
        }
      }
    });
  } catch (error) {
    console.warn('Non-blocking hold release notice:', error);
  }
}

export async function getInventoryHolds(): Promise<InventoryHold[]> {
  try {
    const snap = await getDocs(collection(db, 'inventoryHolds'));
    const holds = snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryHold));
    const nowMs = Date.now();
    return holds
      .map((h) => ({
        ...h,
        status: h.status === 'held' && h.expiresAtMs <= nowMs ? 'expired' : h.status,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'inventoryHolds');
  }
}

export async function releaseHoldByAdmin(holdId: string, adminEmail: string): Promise<void> {
  try {
    let resolvedRoomId = '';
    await runTransaction(db, async (tx) => {
      const holdRef = doc(db, 'inventoryHolds', holdId);
      const holdSnap = await tx.get(holdRef);
      if (!holdSnap.exists()) throw new BookingDomainError('not_found', 'Hold record not found.');
      const hold = holdSnap.data() as InventoryHold;
      resolvedRoomId = hold.roomId;
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      if (hold.roomId) {
        const lockRef = doc(db, 'roomLocks', hold.roomId);
        const lockSnap = await tx.get(lockRef);
        if (lockSnap.exists()) {
          const existingSlots = Array.isArray((lockSnap.data() as RoomLock).slots)
            ? (lockSnap.data() as RoomLock).slots
            : [];
          const nextSlots = pruneExpiredHoldSlots(existingSlots, nowMs).filter((s) => s.slotId !== holdId);
          tx.set(lockRef, { roomId: hold.roomId, slots: nextSlots, updatedAt: nowIso }, { merge: true });
        }
      }

      tx.update(holdRef, {
        status: 'released',
        releasedBy: adminEmail,
        releasedAt: nowIso,
        updatedAt: nowIso,
      });
    });

    await logAdminAudit(
      `Released inventory hold ${holdId}`,
      adminEmail,
      'inventoryHolds',
      holdId,
      { roomId: resolvedRoomId }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `inventoryHolds/${holdId}`);
  }
}

/**
 * Reconciles roomLocks/{roomId} from existing Firestore bookings & unexpired holds.
 * Preserves all existing bookings/holds while ensuring atomic roomLocks index stays accurate.
 */
export async function syncRoomLocksFromBookings(
  bookings: Booking[],
  holds: InventoryHold[] = []
): Promise<void> {
  try {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const grouped = buildRoomLockSlotsFromRecords(bookings, holds, nowMs);
    const roomIds = new Set<string>([...Object.keys(grouped), ...bookings.map((b) => b.roomId).filter(Boolean)]);

    for (const rId of roomIds) {
      const lockRef = doc(db, 'roomLocks', rId);
      const targetSlots = grouped[rId] || [];
      await setDoc(
        lockRef,
        {
          roomId: rId,
          slots: targetSlots,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    }
  } catch (error) {
    console.warn('Room lock reconciliation notice:', error);
  }
}

// ==========================================
// BOOKINGS CRUD (ATOMIC TRANSACTIONAL)
// ==========================================

export async function createBooking(
  bookingData: Omit<Booking, 'id' | 'bookingReference' | 'status' | 'createdAt'> & { status?: BookingStatus }
): Promise<{ id: string; bookingReference: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new BookingDomainError('unauthenticated', 'Please sign in with Google to complete your reservation.');
  }
  if (bookingData.userId !== user.uid) {
    throw new BookingDomainError('forbidden', 'Cannot create a booking on behalf of another user.');
  }

  try {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const bookingReference = `DSH-${dateCode}-${randomSuffix}`;
    const newBookingRef = doc(collection(db, 'bookings'));

    const isPaidVerified =
      bookingData.paymentStatus === 'paid' &&
      bookingData.paymentVerified === true &&
      Boolean(bookingData.razorpayPaymentId);

    // Enforce server/rule-aligned state discipline: customers only confirm directly on verified online payment
    const initialStatus: BookingStatus = isPaidVerified ? 'confirmed' : 'pending';

    await runTransaction(db, async (tx) => {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();

      const roomRef = doc(db, 'rooms', bookingData.roomId);
      const lockRef = doc(db, 'roomLocks', bookingData.roomId);
      const holdRef = bookingData.holdId ? doc(db, 'inventoryHolds', bookingData.holdId) : null;

      const roomSnap = await tx.get(roomRef);
      const lockSnap = await tx.get(lockRef);
      const holdSnap = holdRef ? await tx.get(holdRef) : null;

      const room = roomSnap.exists() ? ({ id: roomSnap.id, ...roomSnap.data() } as Room) : null;

      // Validate explicit hold session if caller attached one
      if (holdSnap && holdSnap.exists()) {
        const holdData = holdSnap.data() as InventoryHold;
        if (holdData.userId !== user.uid) {
          throw new BookingDomainError('temporarily_held', 'Room is temporarily held by another guest.');
        }
        if (holdData.status === 'expired' || (holdData.status === 'held' && holdData.expiresAtMs <= nowMs)) {
          tx.update(holdRef!, { status: 'expired', updatedAt: nowIso });
          throw new BookingDomainError('session_expired', 'Your booking session has expired. Please re-select your room and dates.');
        }
        if (holdData.status === 'released' || holdData.status === 'converted') {
          // Hold already closed — rely cleanly on real-time room lock check below
        }
      }

      const existingSlots = lockSnap.exists() && Array.isArray((lockSnap.data() as RoomLock).slots)
        ? (lockSnap.data() as RoomLock).slots
        : [];

      const availability = evaluateRoomAvailability({
        slots: existingSlots,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        requestingUserId: user.uid,
        room,
        adults: bookingData.adults,
        children: bookingData.children,
        nowMs,
      });

      if (!availability.available) {
        if (availability.status === 'already_booked') {
          throw new BookingDomainError(
            'already_booked',
            bookingData.holdId
              ? 'Another guest has just booked this room.'
              : 'Room is already booked.'
          );
        }
        throw new BookingDomainError(availability.status, availability.message);
      }

      const canonicalNights = calculateNights(bookingData.checkInDate, bookingData.checkOutDate);
      const safeRate = Math.max(0, Number(bookingData.basePricePerNight) || room?.specialPrice || room?.basePrice || 0);
      const canonicalSubtotal = safeRate * canonicalNights;
      const safeDiscount = Math.max(0, Math.min(canonicalSubtotal, Number(bookingData.discountApplied) || 0));
      const canonicalTotal = Math.max(0, canonicalSubtotal - safeDiscount);

      const initialHistory: BookingHistoryItem = {
        id: `hist_${nowMs}`,
        timestamp: nowIso,
        action: initialStatus === 'confirmed' ? 'Booking Confirmed (Online Payment Verified)' : 'Booking Request Created',
        performedBy: bookingData.guestEmail || user.email || user.uid,
        note: initialStatus === 'confirmed' ? 'Confirmed via verified online payment.' : 'Awaiting host confirmation (Pay at Property).',
      };

      const payload = sanitizeForFirestore({
        ...bookingData,
        nights: canonicalNights,
        basePricePerNight: safeRate,
        roomSubtotal: canonicalSubtotal,
        discountApplied: safeDiscount,
        totalAmount: canonicalTotal,
        bookingReference,
        status: initialStatus,
        bookingHistory: [initialHistory],
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      tx.set(newBookingRef, payload);

      // Update PII-free room lock atomically: prune expired holds, remove this user's temporary holds, add new booking slot
      const cleanedSlots = pruneExpiredHoldSlots(existingSlots, nowMs).filter(
        (s) => !(s.kind === 'hold' && (s.userId === user.uid || (bookingData.holdId && s.slotId === bookingData.holdId)))
      );

      const newBookingSlot: RoomLockSlot = {
        slotId: newBookingRef.id,
        kind: 'booking',
        userId: user.uid,
        checkInDate: bookingData.checkInDate,
        checkOutDate: bookingData.checkOutDate,
        status: initialStatus,
        updatedAt: nowIso,
      };

      tx.set(
        lockRef,
        {
          roomId: bookingData.roomId,
          slots: [...cleanedSlots, newBookingSlot],
          updatedAt: nowIso,
        },
        { merge: true }
      );

      if (holdRef && holdSnap && holdSnap.exists() && (holdSnap.data() as InventoryHold).status === 'held') {
        tx.update(holdRef, {
          status: 'converted',
          convertedBookingId: newBookingRef.id,
          updatedAt: nowIso,
        });
      }
    });

    // Non-blocking notification creation after atomic booking commit
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: bookingData.userId,
        type: 'booking',
        title: initialStatus === 'confirmed' ? 'Booking Confirmed (Paid)' : 'Booking Request Submitted',
        message:
          initialStatus === 'confirmed'
            ? `Your reservation ${bookingReference} for ${bookingData.roomName} is confirmed! Payment received.`
            : `Your booking request ${bookingReference} for ${bookingData.roomName} has been received. Devashish Homestay team will confirm shortly.`,
        bookingId: newBookingRef.id,
        bookingReference,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('Booking confirmation notification notice:', notifErr);
    }

    return { id: newBookingRef.id, bookingReference };
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.CREATE, 'bookings');
  }
}

export async function getBookings(): Promise<Booking[]> {
  try {
    const snap = await getDocs(collection(db, 'bookings'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookings');
  }
}

export async function getUserBookings(userId: string): Promise<Booking[]> {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'bookings');
  }
}

// Helper for atomic booking status mutation + roomLocks/{roomId} synchronization
async function mutateBookingAndSyncLock(params: {
  bookingId: string;
  targetStatus?: BookingStatus;
  validateTransition?: boolean;
  actionLabel: string;
  performedBy: string;
  note?: string;
  buildUpdates: (current: Booking, nowIso: string) => Record<string, any>;
}): Promise<{ booking: Booking; previousStatus: BookingStatus }> {
  let capturedBooking!: Booking;
  let previousStatus!: BookingStatus;

  await runTransaction(db, async (tx) => {
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const bRef = doc(db, 'bookings', params.bookingId);
    const bSnap = await tx.get(bRef);
    if (!bSnap.exists()) {
      throw new BookingDomainError('not_found', 'Booking not found.');
    }

    const data = { id: bSnap.id, ...bSnap.data() } as Booking;
    previousStatus = data.status;

    if (params.targetStatus && params.validateTransition !== false) {
      if (!isValidStatusTransition(previousStatus, params.targetStatus)) {
        throw new BookingDomainError(
          'invalid_transition',
          `Cannot change booking from "${previousStatus.replace(/_/g, ' ')}" to "${params.targetStatus.replace(/_/g, ' ')}".`
        );
      }
    }

    const historyItem: BookingHistoryItem = sanitizeForFirestore({
      id: `hist_${nowMs}`,
      timestamp: nowIso,
      action: params.actionLabel,
      performedBy: params.performedBy,
      note: params.note || '',
    });

    const currentHistory = Array.isArray(data.bookingHistory) ? data.bookingHistory : [];
    const customUpdates = sanitizeForFirestore(params.buildUpdates(data, nowIso));
    const nextStatus = (customUpdates.status as BookingStatus) || data.status;

    const mergedUpdates = sanitizeForFirestore({
      ...customUpdates,
      bookingHistory: [...currentHistory, historyItem],
      updatedAt: nowIso,
    });

    const lockRef = doc(db, 'roomLocks', data.roomId);
    const lockSnap = await tx.get(lockRef);
    const existingSlots = lockSnap.exists() && Array.isArray((lockSnap.data() as RoomLock).slots)
      ? (lockSnap.data() as RoomLock).slots
      : [];
    const filteredSlots = pruneExpiredHoldSlots(existingSlots, nowMs).filter((s) => s.slotId !== params.bookingId);

    if (!NON_BLOCKING_BOOKING_STATUSES.has(nextStatus)) {
      filteredSlots.push({
        slotId: params.bookingId,
        kind: 'booking',
        userId: data.userId || '',
        checkInDate: (customUpdates.checkInDate as string) || data.checkInDate,
        checkOutDate: (customUpdates.checkOutDate as string) || data.checkOutDate,
        status: nextStatus,
        updatedAt: nowIso,
      });
    }

    tx.update(bRef, mergedUpdates);
    tx.set(lockRef, { roomId: data.roomId, slots: filteredSlots, updatedAt: nowIso }, { merge: true });

    capturedBooking = { ...data, ...mergedUpdates };
  });

  return { booking: capturedBooking, previousStatus };
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  adminEmail: string,
  note?: string
): Promise<void> {
  try {
    const { booking: bData, previousStatus } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: newStatus,
      actionLabel: `Status updated to ${newStatus}`,
      performedBy: adminEmail,
      note: note || '',
      buildUpdates: () => ({ status: newStatus }),
    });

    // Award Sunlit Rewards points on booking completion (completed or checked_out)
    let newlyEarnedPoints = 0;
    if (
      (newStatus === 'completed' || newStatus === 'checked_out') &&
      !bData?.loyaltyPointsAwarded &&
      bData?.userId
    ) {
      newlyEarnedPoints = await awardPointsForBooking(
        bData.userId,
        Number(bData.totalAmount) || 0,
        bData.bookingReference || bookingId
      );
      if (newlyEarnedPoints > 0) {
        await updateDoc(doc(db, 'bookings', bookingId), {
          loyaltyPointsAwarded: true,
          loyaltyPointsEarned: newlyEarnedPoints,
          loyaltyAwardedAt: new Date().toISOString()
        });
      }
    }

    // Record history
    await addDoc(collection(db, 'bookingStatusHistory'), sanitizeForFirestore({
      bookingId,
      previousStatus,
      newStatus,
      changedBy: adminEmail,
      note: note || '',
      timestamp: new Date().toISOString()
    }));

    await logAdminAudit(
      `Booking status changed to ${newStatus}`,
      adminEmail,
      'bookings',
      bookingId,
      { previousStatus, newStatus, note: note || '', loyaltyPointsAwarded: newlyEarnedPoints }
    );

    if (bData?.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: bData.userId,
        type: newlyEarnedPoints > 0 ? 'loyalty' : 'booking',
        title: newlyEarnedPoints > 0
          ? `Stay Completed · +${newlyEarnedPoints} Sunlit Points!`
          : `Booking Status: ${newStatus.toUpperCase()}`,
        message: newlyEarnedPoints > 0
          ? `Thank you for staying with Devashish Sunlit Homestay! ${newlyEarnedPoints} Sunlit Rewards points have been credited for ${bData?.bookingReference}.`
          : `Your reservation ${bData?.bookingReference} is now marked as ${newStatus}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function approveBooking(
  bookingId: string,
  adminEmail: string,
  note?: string
): Promise<void> {
  try {
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'confirmed',
      actionLabel: 'Approved by Administrator',
      performedBy: adminEmail,
      note: note || 'Booking approved and dates locked in.',
      buildUpdates: () => ({ status: 'confirmed' }),
    });

    if (data.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'booking',
        title: 'Booking Approved!',
        message: `Your reservation ${data.bookingReference} for ${data.roomName} has been approved by the homestay host.`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    await logAdminAudit(
      `Approved booking ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      { note: note || '' }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function rejectBooking(
  bookingId: string,
  adminEmail: string,
  reason: string
): Promise<void> {
  try {
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'rejected',
      actionLabel: 'Booking Rejected',
      performedBy: adminEmail,
      note: reason || 'Declined by property administrator.',
      buildUpdates: (_current, nowIso) => ({
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: nowIso,
      }),
    });

    if (data.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'booking',
        title: 'Booking Request Declined',
        message: `Your request ${data.bookingReference} could not be accepted. Reason: ${reason}`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    await logAdminAudit(
      `Rejected booking ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      { reason: reason || '' }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function cancelBookingByAdmin(
  bookingId: string,
  adminEmail: string,
  reason?: string
): Promise<void> {
  try {
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'cancelled',
      actionLabel: 'Cancelled by Administrator',
      performedBy: adminEmail,
      note: reason || 'Reservation cancelled and room inventory released.',
      buildUpdates: (current, nowIso) => ({
        status: 'cancelled',
        cancellationReason: reason || 'Cancelled by host administrator.',
        cancellationRequestedAt: current.cancellationRequestedAt || nowIso,
        refundStatus: current.paymentStatus === 'paid' ? 'pending' : 'none',
      }),
    });

    if (data.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'cancellation',
        title: 'Reservation Cancelled',
        message: `Your reservation ${data.bookingReference} has been cancelled.${reason ? ` Note: ${reason}` : ''}`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    }

    await logAdminAudit(
      `Cancelled booking ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      { reason: reason || '' }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function proposeBookingChanges(
  bookingId: string,
  adminEmail: string,
  proposal: ProposedBookingChanges
): Promise<void> {
  try {
    const cleanProposal = sanitizeForFirestore(proposal);
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'awaiting_customer_confirmation',
      actionLabel: `Proposed change: Room ${proposal.roomName}, ${proposal.checkInDate} to ${proposal.checkOutDate}`,
      performedBy: adminEmail,
      note: proposal.reason || '',
      buildUpdates: () => ({
        status: 'awaiting_customer_confirmation',
        proposedChanges: cleanProposal,
      }),
    });

    if (data.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'proposal',
        title: 'Proposed Reservation Change',
        message: `Host proposed alternative dates or room for ${data.bookingReference}: ${proposal.reason}. Please review in My Bookings.`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    await logAdminAudit(
      `Proposed room/date change for ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      cleanProposal
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function respondToProposedChanges(
  bookingId: string,
  arg2: boolean | string,
  arg3?: string | boolean,
  arg4?: boolean
): Promise<void> {
  const accept = typeof arg2 === 'boolean' ? arg2 : Boolean(arg4 ?? arg3);
  const userEmail = typeof arg3 === 'string' ? arg3 : (typeof arg2 === 'string' ? arg2 : 'guest');

  try {
    let updatedData!: Booking;

    await runTransaction(db, async (tx) => {
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const bRef = doc(db, 'bookings', bookingId);
      const bSnap = await tx.get(bRef);
      if (!bSnap.exists()) throw new BookingDomainError('not_found', 'Booking not found');

      const data = { id: bSnap.id, ...bSnap.data() } as Booking;
      const proposal = data.proposedChanges;
      if (!proposal) throw new BookingDomainError('not_found', 'No active proposed changes found');

      const currentHistory = Array.isArray(data.bookingHistory) ? data.bookingHistory : [];

      if (accept) {
        const targetRoomRef = doc(db, 'rooms', proposal.roomId);
        const targetLockRef = doc(db, 'roomLocks', proposal.roomId);
        const oldLockRef = data.roomId !== proposal.roomId ? doc(db, 'roomLocks', data.roomId) : null;

        const targetRoomSnap = await tx.get(targetRoomRef);
        const targetLockSnap = await tx.get(targetLockRef);
        const oldLockSnap = oldLockRef ? await tx.get(oldLockRef) : null;

        const targetRoom = targetRoomSnap.exists() ? ({ id: targetRoomSnap.id, ...targetRoomSnap.data() } as Room) : null;
        const targetSlots = targetLockSnap.exists() && Array.isArray((targetLockSnap.data() as RoomLock).slots)
          ? (targetLockSnap.data() as RoomLock).slots
          : [];

        const avail = evaluateRoomAvailability({
          slots: targetSlots,
          checkInDate: proposal.checkInDate,
          checkOutDate: proposal.checkOutDate,
          requestingUserId: data.userId,
          room: targetRoom,
          excludeBookingId: bookingId,
          nowMs,
        });

        if (!avail.available) {
          throw new BookingDomainError(avail.status, avail.message);
        }

        const historyItem: BookingHistoryItem = {
          id: `hist_${nowMs}`,
          timestamp: nowIso,
          action: 'Customer Accepted Proposed Changes',
          performedBy: userEmail,
          note: 'Reservation updated with proposed room & dates.',
        };

        const updates = sanitizeForFirestore({
          roomId: proposal.roomId,
          roomName: proposal.roomName,
          roomCategory: proposal.roomCategory,
          checkInDate: proposal.checkInDate,
          checkOutDate: proposal.checkOutDate,
          totalAmount: proposal.totalAmount,
          status: 'confirmed',
          proposedChanges: { ...proposal, status: 'accepted' },
          bookingHistory: [...currentHistory, historyItem],
          updatedAt: nowIso,
        });

        tx.update(bRef, updates);

        if (oldLockRef && oldLockSnap?.exists()) {
          const oldSlots = Array.isArray((oldLockSnap.data() as RoomLock).slots)
            ? (oldLockSnap.data() as RoomLock).slots
            : [];
          tx.set(
            oldLockRef,
            {
              roomId: data.roomId,
              slots: pruneExpiredHoldSlots(oldSlots, nowMs).filter((s) => s.slotId !== bookingId),
              updatedAt: nowIso,
            },
            { merge: true }
          );
        }

        const nextTargetSlots = pruneExpiredHoldSlots(targetSlots, nowMs).filter((s) => s.slotId !== bookingId);
        nextTargetSlots.push({
          slotId: bookingId,
          kind: 'booking',
          userId: data.userId || '',
          checkInDate: proposal.checkInDate,
          checkOutDate: proposal.checkOutDate,
          status: 'confirmed',
          updatedAt: nowIso,
        });
        tx.set(targetLockRef, { roomId: proposal.roomId, slots: nextTargetSlots, updatedAt: nowIso }, { merge: true });

        updatedData = { ...data, ...updates, status: 'confirmed', proposedChanges: { ...proposal, status: 'accepted' } } as Booking;
      } else {
        const historyItem: BookingHistoryItem = {
          id: `hist_${nowMs}`,
          timestamp: nowIso,
          action: 'Customer Declined Proposed Changes',
          performedBy: userEmail,
          note: 'Kept original reservation request.',
        };

        const updates = sanitizeForFirestore({
          status: 'pending',
          proposedChanges: { ...proposal, status: 'declined' },
          bookingHistory: [...currentHistory, historyItem],
          updatedAt: nowIso,
        });

        tx.update(bRef, updates);
        updatedData = { ...data, ...updates, status: 'pending', proposedChanges: { ...proposal, status: 'declined' } } as Booking;
      }
    });

    await addDoc(collection(db, 'notifications'), {
      recipientUid: 'admin',
      type: 'proposal',
      title: accept ? 'Customer Accepted Proposed Change' : 'Customer Declined Proposed Change',
      message: accept
        ? `Guest ${updatedData.guestName} accepted proposed change for reservation ${updatedData.bookingReference}.`
        : `Guest ${updatedData.guestName} declined proposed change for reservation ${updatedData.bookingReference}. Awaiting host review.`,
      bookingId,
      bookingReference: updatedData.bookingReference,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function requestBookingCancellation(
  bookingId: string,
  arg2: string,
  arg3?: string,
  arg4?: string
): Promise<void> {
  const reason = arg4 ? arg4 : arg2;
  const userEmail = typeof arg3 === 'string' ? arg3 : 'guest';

  try {
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'cancellation_requested',
      actionLabel: 'Cancellation Requested by Guest',
      performedBy: userEmail,
      note: reason || '',
      buildUpdates: (_current, nowIso) => ({
        status: 'cancellation_requested',
        cancellationReason: reason,
        cancellationRequestedAt: nowIso,
      }),
    });

    await addDoc(collection(db, 'notifications'), {
      recipientUid: 'admin',
      type: 'cancellation',
      title: 'Cancellation Requested',
      message: `Guest ${data.guestName} requested cancellation for ${data.bookingReference}. Reason: ${reason}`,
      bookingId,
      bookingReference: data.bookingReference,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function resolveCancellationRequest(
  bookingId: string,
  adminEmail: string,
  approved: boolean,
  note?: string
): Promise<void> {
  try {
    const targetStatus: BookingStatus = approved ? 'cancelled' : 'confirmed';
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus,
      actionLabel: approved ? 'Cancellation Approved by Admin' : 'Cancellation Request Declined',
      performedBy: adminEmail,
      note: note || (approved ? 'Reservation cancelled.' : 'Booking remains active per cancellation policy window.'),
      buildUpdates: (current) =>
        approved
          ? {
              status: 'cancelled',
              refundStatus: current.paymentStatus === 'paid' ? 'pending' : 'none',
            }
          : {
              status: 'confirmed',
            },
    });

    if (data.userId) {
      const refundNeeded = approved && data.paymentStatus === 'paid';
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'cancellation',
        title: approved ? 'Cancellation Request Approved' : 'Cancellation Request Not Approved',
        message: approved
          ? `Your cancellation request for ${data.bookingReference} has been processed.${refundNeeded ? ' Any eligible refund is under verification.' : ''}`
          : `Your cancellation request for ${data.bookingReference} could not be approved: ${note || 'Reservation remains confirmed.'}`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    await logAdminAudit(
      `${approved ? 'Approved' : 'Declined'} cancellation for ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      { approved, note: note || '' }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function verifyBookingPayment(
  bookingId: string,
  adminEmail: string,
  note?: string
): Promise<void> {
  try {
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'confirmed',
      validateTransition: false,
      actionLabel: 'Payment Verified by Admin',
      performedBy: adminEmail,
      note: note || 'Verified via bank receipt / UPI reference.',
      buildUpdates: (_current, nowIso) => ({
        paymentStatus: 'paid',
        paymentVerified: true,
        paymentVerifiedBy: adminEmail,
        paymentVerifiedAt: nowIso,
        status: 'confirmed',
      }),
    });

    if (data.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'payment',
        title: 'Payment Verified!',
        message: `Your payment of ₹${data.totalAmount} for reservation ${data.bookingReference} has been verified by the host.`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    await logAdminAudit(
      `Verified payment for ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      { amount: data.totalAmount, note: note || '' }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function checkInGuest(
  bookingId: string,
  adminEmail: string,
  note?: string
): Promise<void> {
  try {
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'checked_in',
      actionLabel: 'Official Check-In Completed',
      performedBy: adminEmail,
      note: note || 'Room keys handed over, ID verified.',
      buildUpdates: (_current, nowIso) => ({
        status: 'checked_in',
        actualCheckInTime: nowIso,
      }),
    });

    if (data.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'checkin',
        title: 'Welcome to Devashish Sunlit Homestay!',
        message: `You are now checked in to Room ${data.roomName}. Enjoy your stay! Wi-Fi and amenities are available on your guest hub.`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    await logAdminAudit(
      `Checked in guest for ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      { note: note || '' }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function checkOutGuest(
  bookingId: string,
  adminEmail: string,
  note?: string
): Promise<void> {
  try {
    const { booking: data } = await mutateBookingAndSyncLock({
      bookingId,
      targetStatus: 'checked_out',
      actionLabel: 'Official Check-Out Completed',
      performedBy: adminEmail,
      note: note || 'Keys returned, room settlement finalized.',
      buildUpdates: (_current, nowIso) => ({
        status: 'checked_out',
        actualCheckOutTime: nowIso,
      }),
    });

    // Automatically trigger a turnover cleaning task
    try {
      await createHousekeepingTask({
        roomNumber: data.roomName.replace(/[^0-9]/g, '') || '101',
        taskType: 'checkout_turnover',
        priority: 'urgent',
        deadline: 'Turnover Today',
        status: 'pending',
        notes: `Turnover cleaning after checkout of ${data.guestName} (${data.bookingReference}).`,
        inspectionPassed: false
      });
    } catch (e) {
      console.warn('Turnover task trigger notice:', e);
    }

    if (data.userId) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: data.userId,
        type: 'checkout',
        title: 'Check-Out Completed',
        message: `Thank you for choosing Devashish Sunlit Homestay! Your stay is finalized and reward points have been credited to your club balance.`,
        bookingId,
        bookingReference: data.bookingReference,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    await logAdminAudit(
      `Checked out guest for ${data.bookingReference}`,
      adminEmail,
      'bookings',
      bookingId,
      { note: note || '' }
    );
  } catch (error) {
    if (error instanceof BookingDomainError) throw error;
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function notifyGuestArrival(
  bookingId: string,
  guestName: string,
  arrivalNote?: string
): Promise<void> {
  try {
    const bRef = doc(db, 'bookings', bookingId);
    const bSnap = await getDoc(bRef);
    if (!bSnap.exists()) throw new Error('Booking not found');

    const data = bSnap.data() as Booking;
    const nowIso = new Date().toISOString();

    await updateDoc(bRef, {
      arrivalStatus: 'arrived',
      arrivalReportedAt: nowIso,
      arrivalNote: arrivalNote || 'Guest reported arrival at homestay premises.',
      updatedAt: nowIso
    });

    await addDoc(collection(db, 'notifications'), {
      recipientUid: 'admin',
      type: 'arrival',
      title: 'Guest Has Arrived!',
      message: `${guestName} has arrived at the property for reservation ${data.bookingReference} (Room: ${data.roomName}). Ready for check-in.`,
      bookingId,
      bookingReference: data.bookingReference,
      isRead: false,
      createdAt: nowIso
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function requestCheckInAssistance(
  bookingId: string,
  guestName: string,
  details?: string
): Promise<void> {
  try {
    const bRef = doc(db, 'bookings', bookingId);
    const bSnap = await getDoc(bRef);
    if (!bSnap.exists()) throw new Error('Booking not found');

    const data = bSnap.data() as Booking;
    const nowIso = new Date().toISOString();

    await updateDoc(bRef, {
      arrivalStatus: 'assistance_requested',
      arrivalNote: details,
      updatedAt: nowIso
    });

    await addDoc(collection(db, 'notifications'), {
      recipientUid: 'admin',
      type: 'arrival',
      title: 'Check-In Assistance Requested',
      message: `Guest ${guestName} (${data.bookingReference}) requested assistance: "${details}".`,
      bookingId,
      bookingReference: data.bookingReference,
      isRead: false,
      createdAt: nowIso
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function requestCheckOutAssistance(
  bookingId: string,
  guestName: string,
  details?: string
): Promise<void> {
  try {
    const bRef = doc(db, 'bookings', bookingId);
    const bSnap = await getDoc(bRef);
    if (!bSnap.exists()) throw new Error('Booking not found');

    const data = bSnap.data() as Booking;
    const nowIso = new Date().toISOString();

    await updateDoc(bRef, {
      checkoutRequested: true,
      checkoutRequestedAt: nowIso,
      updatedAt: nowIso
    });

    await addDoc(collection(db, 'notifications'), {
      recipientUid: 'admin',
      type: 'checkout',
      title: 'Checkout Requested',
      message: `Guest ${guestName} (${data.bookingReference}) is preparing to check out: ${details || 'Ready for room inspection & key handover'}.`,
      bookingId,
      bookingReference: data.bookingReference,
      isRead: false,
      createdAt: nowIso
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function addBookingInternalNote(
  bookingId: string,
  adminEmail: string,
  note: string
): Promise<void> {
  try {
    const bRef = doc(db, 'bookings', bookingId);
    const bSnap = await getDoc(bRef);
    if (!bSnap.exists()) throw new Error('Booking not found');

    const data = bSnap.data() as Booking;
    const historyItem: BookingHistoryItem = {
      id: `hist_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'Internal Note Added',
      performedBy: adminEmail,
      note
    };

    const currentHistory = data.bookingHistory || [];
    await updateDoc(bRef, {
      internalNotes: note,
      bookingHistory: [...currentHistory, historyItem],
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
  }
}

export async function getAdminNotifications(): Promise<NotificationItem[]> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', 'admin')
    );
    const snap = await getDocs(q);
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', userId),
      where('isRead', '==', false)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await updateDoc(doc(db, 'notifications', d.id), { isRead: true });
    }
  } catch (error) {
    console.warn('Error marking all notifications as read:', error);
  }
}

export async function createNotification(
  data: Omit<NotificationItem, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const res = await addDoc(collection(db, 'notifications'), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
  }
}

// ==========================================
// SUNLIT PLAY & EARN (GAME PROGRESS & VOUCHERS)
// ==========================================

export async function getUserGameProgress(userId: string): Promise<UserGameProgress> {
  try {
    const snap = await getDoc(doc(db, 'gameProgress', userId));
    if (snap.exists()) {
      const d = snap.data();
      return {
        ...d,
        pointsBalance: d.pointsBalance ?? d.totalTokensCollected ?? 0,
        dailyPointsEarned: d.dailyPointsEarned ?? d.pointsEarnedToday ?? 0
      } as UserGameProgress;
    }
    return {
      userId,
      highScore: 0,
      level: 1,
      totalTokensCollected: 0,
      pointsEarnedToday: 0,
      pointsBalance: 0,
      dailyPointsEarned: 0,
      lastPlayedDate: new Date().toISOString().slice(0, 10),
      quizzesCompleted: 0
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `gameProgress/${userId}`);
    return {
      userId,
      highScore: 0,
      level: 1,
      totalTokensCollected: 0,
      pointsEarnedToday: 0,
      pointsBalance: 0,
      dailyPointsEarned: 0,
      lastPlayedDate: new Date().toISOString().slice(0, 10),
      quizzesCompleted: 0
    };
  }
}

export async function saveUserGameProgress(
  userId: string,
  progress: Partial<UserGameProgress>
): Promise<void> {
  try {
    const ref = doc(db, 'gameProgress', userId);
    await setDoc(ref, {
      userId,
      ...progress,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `gameProgress/${userId}`);
  }
}

export async function getUserRewardVouchers(userId: string): Promise<GameRewardVoucher[]> {
  try {
    const q = query(
      collection(db, 'gameVouchers'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => {
      const v = d.data();
      return {
        id: d.id,
        ...v,
        code: v.code || v.voucherCode || '',
        voucherCode: v.voucherCode || v.code || '',
        isUsed: v.status === 'used' || v.isUsed === true,
        status: v.status || (v.isUsed ? 'used' : 'active')
      } as GameRewardVoucher;
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'gameVouchers');
    return [];
  }
}

export async function createRewardVoucher(
  data: Omit<GameRewardVoucher, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const res = await addDoc(collection(db, 'gameVouchers'), {
      ...data,
      createdAt: new Date().toISOString()
    });
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'gameVouchers');
  }
}

// ==========================================
// PLAY AREA TIMINGS & BOOKINGS
// ==========================================

export async function getPlayAreaSettings(): Promise<PlayAreaSettings> {
  try {
    const snap = await getDoc(doc(db, 'playAreaSettings', 'current'));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as PlayAreaSettings;
    }
    return INITIAL_PLAY_AREA_SETTINGS;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'playAreaSettings/current');
  }
}

export async function updatePlayAreaSettings(data: Partial<PlayAreaSettings>, adminEmail: string): Promise<void> {
  try {
    const ref = doc(db, 'playAreaSettings', 'current');
    await updateDoc(ref, {
      ...data,
      updatedAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'adminAuditLogs'), {
      action: 'Updated Kids Play Area schedule/settings',
      performedBy: adminEmail,
      targetCollection: 'playAreaSettings',
      targetId: 'current',
      details: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'playAreaSettings/current');
  }
}

export async function getPlayAreaBookings(): Promise<PlayAreaBooking[]> {
  try {
    const snap = await getDocs(collection(db, 'playAreaBookings'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as PlayAreaBooking));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'playAreaBookings');
  }
}

export async function createPlayAreaBooking(
  bookingData: Omit<PlayAreaBooking, 'id' | 'bookingReference' | 'status' | 'createdAt'>
): Promise<string> {
  try {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const bookingReference = `PLAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

    const docRef = await addDoc(collection(db, 'playAreaBookings'), {
      ...bookingData,
      bookingReference,
      status: 'confirmed',
      createdAt: new Date().toISOString()
    });

    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'playAreaBookings');
  }
}

export async function cancelPlayAreaBooking(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'playAreaBookings', id), { status: 'cancelled' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `playAreaBookings/${id}`);
  }
}

// ==========================================
// ROOFTOP PACKAGES & RESERVATIONS
// ==========================================

export async function getRooftopPackages(): Promise<RooftopPackage[]> {
  try {
    const snap = await getDocs(collection(db, 'rooftopPackages'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RooftopPackage));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'rooftopPackages');
  }
}

export async function addRooftopPackage(data: Omit<RooftopPackage, 'id'>): Promise<string> {
  try {
    const res = await addDoc(collection(db, 'rooftopPackages'), data);
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'rooftopPackages');
  }
}

export async function updateRooftopPackage(id: string, data: Partial<RooftopPackage>): Promise<void> {
  try {
    await updateDoc(doc(db, 'rooftopPackages', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooftopPackages/${id}`);
  }
}

export async function getRooftopBookings(): Promise<RooftopBooking[]> {
  try {
    const snap = await getDocs(collection(db, 'rooftopBookings'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RooftopBooking));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'rooftopBookings');
  }
}

export async function createRooftopBooking(
  data: Omit<RooftopBooking, 'id' | 'status' | 'createdAt'>
): Promise<string> {
  try {
    const res = await addDoc(collection(db, 'rooftopBookings'), {
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'rooftopBookings');
  }
}

export async function updateRooftopBookingStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled',
  adminEmail?: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'rooftopBookings', id), { status });
    if (adminEmail) {
      await addDoc(collection(db, 'adminAuditLogs'), {
        action: `Updated rooftop booking ${id} status to ${status}`,
        performedBy: adminEmail,
        targetCollection: 'rooftopBookings',
        targetId: id,
        details: { status },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooftopBookings/${id}`);
  }
}

// ==========================================
// EXPENSES & FINANCIAL LEDGER
// ==========================================

export async function getExpenses(): Promise<Expense[]> {
  try {
    const snap = await getDocs(collection(db, 'expenses'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'expenses');
  }
}

export async function addExpense(data: Omit<Expense, 'id' | 'createdAt'>, adminEmail?: string): Promise<string> {
  try {
    const res = await addDoc(collection(db, 'expenses'), {
      ...data,
      createdAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'adminAuditLogs'), {
      action: `Recorded expense of ₹${data.amount} for ${data.category}`,
      performedBy: adminEmail || data.enteredBy,
      targetCollection: 'expenses',
      targetId: res.id,
      details: data,
      timestamp: new Date().toISOString()
    });

    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'expenses');
  }
}

export async function deleteExpense(id: string, adminEmail: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'expenses', id));
    await addDoc(collection(db, 'adminAuditLogs'), {
      action: `Deleted expense record ${id}`,
      performedBy: adminEmail,
      targetCollection: 'expenses',
      targetId: id,
      details: {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
  }
}

// ==========================================
// FACILITIES & OFFERS
// ==========================================

export async function getFacilities(): Promise<Facility[]> {
  try {
    const snap = await getDocs(collection(db, 'facilities'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Facility));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'facilities');
  }
}

export async function updateFacility(id: string, data: Partial<Facility>): Promise<void> {
  try {
    await updateDoc(doc(db, 'facilities', id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `facilities/${id}`);
  }
}

export async function getOffers(): Promise<Offer[]> {
  try {
    const snap = await getDocs(collection(db, 'offers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'offers');
  }
}

export async function updateOffer(id: string, data: Partial<Offer>, adminEmail?: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'offers', id), data);
    if (adminEmail) {
      await addDoc(collection(db, 'adminAuditLogs'), {
        action: `Updated offer ${id}`,
        performedBy: adminEmail,
        targetCollection: 'offers',
        targetId: id,
        details: data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `offers/${id}`);
  }
}

export async function addOffer(data: Omit<Offer, 'id'>): Promise<string> {
  try {
    const res = await addDoc(collection(db, 'offers'), data);
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'offers');
  }
}

// ==========================================
// AUDIT LOGS & NOTIFICATIONS
// ==========================================

export async function getAuditLogs(): Promise<AdminAuditLog[]> {
  try {
    const snap = await getDocs(collection(db, 'adminAuditLogs'));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() } as AdminAuditLog));
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'adminAuditLogs');
  }
}

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientUid', '==', userId)
    );
    const snap = await getDocs(q);
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificationItem));
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
  }
}

// ==========================================
// CONTACT ENQUIRIES
// ==========================================

export async function submitContactEnquiry(data: Omit<ContactEnquiry, 'id' | 'status' | 'createdAt'>): Promise<string> {
  try {
    const res = await addDoc(collection(db, 'contactEnquiries'), {
      ...data,
      status: 'new',
      createdAt: new Date().toISOString()
    });
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'contactEnquiries');
  }
}

export async function getContactEnquiries(): Promise<ContactEnquiry[]> {
  try {
    const snap = await getDocs(collection(db, 'contactEnquiries'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ContactEnquiry));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'contactEnquiries');
  }
}

// ==========================================
// CUSTOMER SERVICE REQUESTS
// ==========================================

export async function getServiceRequests(): Promise<CustomerServiceRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'serviceRequests'));
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerServiceRequest));
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'serviceRequests');
  }
}

export async function getUserServiceRequests(userId: string): Promise<CustomerServiceRequest[]> {
  try {
    const q = query(
      collection(db, 'serviceRequests'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const requests = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerServiceRequest));
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'serviceRequests');
  }
}

export async function createServiceRequest(
  data: Omit<CustomerServiceRequest, 'id' | 'status' | 'createdAt'>
): Promise<string> {
  try {
    const payload = {
      ...data,
      status: 'submitted' as ServiceRequestStatus,
      createdAt: new Date().toISOString()
    };
    const res = await addDoc(collection(db, 'serviceRequests'), payload);

    // Notify guest
    await addDoc(collection(db, 'notifications'), {
      recipientUid: data.userId,
      type: 'service_request',
      title: 'Service Request Logged',
      message: `Your request for ${data.serviceType} (Room ${data.roomNumber}) has been received by Devashish staff.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'serviceRequests');
  }
}

export async function updateServiceRequestStatus(
  id: string,
  status: ServiceRequestStatus,
  assignedStaffId?: string,
  assignedStaffName?: string,
  adminEmail?: string
): Promise<void> {
  try {
    const ref = doc(db, 'serviceRequests', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Service request not found');

    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (assignedStaffId) updatePayload.assignedStaffId = assignedStaffId;
    if (assignedStaffName) updatePayload.assignedStaffName = assignedStaffName;
    if (status === 'completed') updatePayload.completedAt = new Date().toISOString();

    await updateDoc(ref, updatePayload);

    // Log admin audit
    if (adminEmail) {
      await logAdminAudit(
        `Service request ${id} updated to ${status}`,
        adminEmail,
        'serviceRequests',
        id,
        { status, assignedStaffName: assignedStaffName || '' }
      );
    }

    // Notify guest
    const guestUid = snap.data()?.userId;
    if (guestUid) {
      await addDoc(collection(db, 'notifications'), {
        recipientUid: guestUid,
        type: 'service_request',
        title: `Service Request: ${status.toUpperCase()}`,
        message: `Your request for "${snap.data()?.serviceType}" is now marked as ${status}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `serviceRequests/${id}`);
  }
}

export async function rateServiceRequest(
  id: string,
  rating: number,
  reviewComment?: string
): Promise<void> {
  try {
    const ref = doc(db, 'serviceRequests', id);
    await updateDoc(ref, {
      rating,
      reviewComment: reviewComment || '',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `serviceRequests/${id}`);
  }
}

// ==========================================
// HOUSEKEEPING TASKS & SCHEDULE
// ==========================================

export async function getHousekeepingTasks(): Promise<HousekeepingTask[]> {
  try {
    const snap = await getDocs(collection(db, 'housekeepingTasks'));
    const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as HousekeepingTask));
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'housekeepingTasks');
  }
}

export async function createHousekeepingTask(
  data: Omit<HousekeepingTask, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const payload = {
      ...data,
      createdAt: new Date().toISOString()
    };
    const res = await addDoc(collection(db, 'housekeepingTasks'), payload);
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'housekeepingTasks');
  }
}

export async function updateHousekeepingTask(
  id: string,
  data: Partial<HousekeepingTask>,
  adminEmail?: string
): Promise<void> {
  try {
    const ref = doc(db, 'housekeepingTasks', id);
    const updatePayload: Record<string, any> = { ...data };
    if (data.status === 'completed') {
      updatePayload.completedAt = new Date().toISOString();
    }
    await updateDoc(ref, updatePayload);

    if (adminEmail) {
      await addDoc(collection(db, 'adminAuditLogs'), {
        action: `Housekeeping task ${id} updated: ${data.status || 'modified'}`,
        performedBy: adminEmail,
        targetCollection: 'housekeepingTasks',
        targetId: id,
        details: data,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `housekeepingTasks/${id}`);
  }
}

export async function triggerCheckoutTurnoverTask(
  roomNumber: string,
  roomId: string,
  guestName: string
): Promise<void> {
  try {
    // 1. Mark room as cleaning in rooms collection
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      availabilityStatus: 'cleaning'
    });

    // 2. Generate turnover cleaning task
    await addDoc(collection(db, 'housekeepingTasks'), {
      roomNumber,
      roomId,
      taskType: 'checkout_turnover',
      priority: 'high',
      deadline: '1:30 PM Today',
      status: 'pending',
      notes: `Guest checkout: ${guestName}. Change all bed linens, disinfect bathroom, restock tea/water, vacuum.`,
      inspectionPassed: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not auto-generate checkout turnover task:', err);
  }
}

// ==========================================
// STAFF MANAGEMENT
// ==========================================

export async function getStaffMembers(): Promise<StaffMember[]> {
  try {
    const snap = await getDocs(collection(db, 'staffMembers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as StaffMember));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'staffMembers');
  }
}

export async function addStaffMember(
  data: Omit<StaffMember, 'id' | 'createdAt' | 'completedTasksCount'>,
  adminEmail: string
): Promise<string> {
  try {
    const payload = {
      ...data,
      completedTasksCount: 0,
      createdAt: new Date().toISOString()
    };
    const res = await addDoc(collection(db, 'staffMembers'), payload);

    await addDoc(collection(db, 'adminAuditLogs'), {
      action: `Enrolled staff member: ${data.name} (${data.designation})`,
      performedBy: adminEmail,
      targetCollection: 'staffMembers',
      targetId: res.id,
      details: data,
      timestamp: new Date().toISOString()
    });

    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'staffMembers');
  }
}

export async function updateStaffMember(
  id: string,
  data: Partial<StaffMember>,
  adminEmail: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'staffMembers', id), data);
    await addDoc(collection(db, 'adminAuditLogs'), {
      action: `Updated staff profile ${id}`,
      performedBy: adminEmail,
      targetCollection: 'staffMembers',
      targetId: id,
      details: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `staffMembers/${id}`);
  }
}

// ==========================================
// ROOM PRICING HISTORY & UPDATES
// ==========================================

export async function getPricingHistory(roomId?: string): Promise<RoomPricingHistory[]> {
  try {
    const snap = await getDocs(collection(db, 'roomPricingHistory'));
    let records = snap.docs.map(d => ({ id: d.id, ...d.data() } as RoomPricingHistory));
    if (roomId) {
      records = records.filter(r => r.roomId === roomId);
    }
    return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'roomPricingHistory');
  }
}

export async function updateRoomPriceWithHistory(
  roomId: string,
  newPrice: number,
  priceType: PriceType,
  reason: string,
  adminEmail: string
): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) throw new Error('Room not found');

    const previousPrice = roomSnap.data()?.basePrice || 0;
    const roomNumber = roomSnap.data()?.roomNumber || 'Unknown';

    // 1. Update room record
    const updateField = priceType === 'standard' ? { basePrice: newPrice } : { specialPrice: newPrice };
    await updateDoc(roomRef, {
      ...updateField,
      updatedAt: new Date().toISOString()
    });

    // 2. Log immutable pricing history
    await addDoc(collection(db, 'roomPricingHistory'), {
      roomId,
      roomNumber,
      previousPrice,
      newPrice,
      priceType,
      changedBy: adminEmail,
      reason,
      timestamp: new Date().toISOString()
    });

    // 3. Admin audit log
    await addDoc(collection(db, 'adminAuditLogs'), {
      action: `Adjusted Room ${roomNumber} ${priceType} rate: ₹${previousPrice} -> ₹${newPrice}`,
      performedBy: adminEmail,
      targetCollection: 'rooms',
      targetId: roomId,
      details: { previousPrice, newPrice, priceType, reason },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `rooms/${roomId}`);
  }
}

// ==========================================
// CUSTOMER FEEDBACK & REVIEWS
// ==========================================

export async function getCustomerFeedback(): Promise<CustomerFeedback[]> {
  try {
    const snap = await getDocs(collection(db, 'customerFeedback'));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerFeedback));
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'customerFeedback');
  }
}

export async function submitCustomerFeedback(
  data: Omit<CustomerFeedback, 'id' | 'createdAt'>
): Promise<string> {
  try {
    const cleanPayload: Record<string, any> = {
      guestName: data.guestName,
      rating: data.rating,
      category: data.category,
      comments: data.comments,
      verifiedStay: Boolean(data.verifiedStay),
      createdAt: new Date().toISOString()
    };
    if (data.userId) cleanPayload.userId = data.userId;
    if (data.bookingReference) cleanPayload.bookingReference = data.bookingReference;
    if (data.roomNumber) cleanPayload.roomNumber = data.roomNumber;
    if (data.subRatings) cleanPayload.subRatings = data.subRatings;

    const res = await addDoc(collection(db, 'customerFeedback'), cleanPayload);
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'customerFeedback');
  }
}

export async function respondToCustomerFeedback(
  id: string,
  response: string,
  adminEmail: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'customerFeedback', id), {
      responseByOwner: response,
      respondedAt: new Date().toISOString()
    });

    await addDoc(collection(db, 'adminAuditLogs'), {
      action: `Responded to guest review ${id}`,
      performedBy: adminEmail,
      targetCollection: 'customerFeedback',
      targetId: id,
      details: { response },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `customerFeedback/${id}`);
  }
}

// ==========================================
// 3D ROOM CONFIGURATIONS
// ==========================================

export async function getRoom3DConfigs(): Promise<Room3DConfig[]> {
  try {
    const snap = await getDocs(collection(db, 'room3DConfigs'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Room3DConfig));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'room3DConfigs');
  }
}

export async function getRoom3DConfig(roomId: string): Promise<Room3DConfig | null> {
  try {
    const q = query(
      collection(db, 'room3DConfigs'),
      where('roomId', '==', roomId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Room3DConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `room3DConfigs/${roomId}`);
  }
}

export async function saveRoom3DConfig(
  config: Omit<Room3DConfig, 'id'>,
  adminEmail: string
): Promise<string> {
  try {
    const q = query(
      collection(db, 'room3DConfigs'),
      where('roomId', '==', config.roomId)
    );
    const snap = await getDocs(q);

    let docId = '';
    if (!snap.empty) {
      docId = snap.docs[0].id;
      await updateDoc(doc(db, 'room3DConfigs', docId), {
        ...config,
        updatedAt: new Date().toISOString()
      });
    } else {
      const res = await addDoc(collection(db, 'room3DConfigs'), {
        ...config,
        createdAt: new Date().toISOString()
      });
      docId = res.id;
    }

    await addDoc(collection(db, 'adminAuditLogs'), {
      action: `Updated 3D Room configuration for Room ${config.roomNumber}`,
      performedBy: adminEmail,
      targetCollection: 'room3DConfigs',
      targetId: docId,
      details: config,
      timestamp: new Date().toISOString()
    });

    return docId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'room3DConfigs');
  }
}

// ==========================================
// GUEST ID DOCUMENT & STATUTORY COMPLIANCE
// ==========================================

export async function getGuestIdDocument(userId: string): Promise<GuestIdDocument | null> {
  try {
    const docRef = doc(db, 'guestDocuments', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as GuestIdDocument;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `guestDocuments/${userId}`);
    return null;
  }
}

export async function saveGuestIdDocument(docData: GuestIdDocument): Promise<void> {
  try {
    const docRef = doc(db, 'guestDocuments', docData.userId);
    const nowIso = new Date().toISOString();
    await setDoc(docRef, {
      ...docData,
      updatedAt: nowIso
    }, { merge: true });

    // Notify admin reception of submitted document
    await addDoc(collection(db, 'notifications'), {
      recipientUid: 'admin',
      type: 'guest_document',
      title: 'Guest ID Document Submitted',
      message: `${docData.guestName} submitted ${docData.documentType.toUpperCase()} for verification.`,
      isRead: false,
      createdAt: nowIso
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `guestDocuments/${docData.userId}`);
  }
}

export async function getAllGuestDocuments(): Promise<GuestIdDocument[]> {
  try {
    const snap = await getDocs(collection(db, 'guestDocuments'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GuestIdDocument));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'guestDocuments');
    return [];
  }
}

export async function verifyGuestDocument(
  userId: string,
  status: 'verified' | 'rejected' | 'pending_review',
  adminEmail: string,
  rejectionReason?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'guestDocuments', userId);
    const nowIso = new Date().toISOString();
    await updateDoc(docRef, {
      verificationStatus: status,
      verifiedBy: adminEmail,
      verifiedAt: nowIso,
      rejectionReason: rejectionReason || '',
      updatedAt: nowIso
    });

    // Notify guest
    await addDoc(collection(db, 'notifications'), {
      recipientUid: userId,
      type: 'document_verification',
      title: status === 'verified' ? 'Identity Verified' : 'Document Verification Notice',
      message: status === 'verified'
        ? 'Your guest identity verification is complete. Express contactless check-in is now enabled.'
        : `Verification pending revision: ${rejectionReason || 'Please resubmit a valid government ID.'}`,
      isRead: false,
      createdAt: nowIso
    });

    await logAdminAudit(
      `${status === 'verified' ? 'Verified' : 'Rejected'} Guest ID for user ${userId}`,
      adminEmail,
      'guestDocuments',
      userId,
      { status, rejectionReason: rejectionReason || '' }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `guestDocuments/${userId}`);
  }
}
