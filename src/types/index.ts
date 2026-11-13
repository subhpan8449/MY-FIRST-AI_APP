export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: 'guest' | 'admin';
  loyaltyPoints?: number;
  loyaltyTier?: 'explorer' | 'pioneer' | 'patron';
  createdAt: string;
  updatedAt?: string;
}

export interface AdminRoleRecord {
  id: string;
  uid?: string;
  email: string;
  name: string;
  designation: string;
  role: 'primary_owner' | 'co_partner' | 'admin';
  phone: string;
  isPublicVisible: boolean;
  status: 'active' | 'disabled';
  createdAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  category: string;
  description: string;
  floor: string;
  viewType: 'city' | 'hill' | 'garden' | 'standard';
  beds: number;
  bedType: string;
  adultCapacity: number;
  childCapacity: number;
  totalCapacity: number;
  amenities: string[];
  images: string[];
  basePrice: number;
  specialPrice?: number;
  weekendPrice?: number;
  studentPrice?: number;
  couplePrice?: number;
  familyPrice?: number;
  longStayPrice?: number;
  isActive: boolean;
  isMaintenance: boolean;
  availabilityStatus: 'available' | 'occupied' | 'maintenance' | 'blocked' | 'cleaning';
  createdAt?: string;
  updatedAt?: string;
}

export interface Facility {
  id: string;
  name: string;
  description: string;
  category: string;
  timings: string;
  rules: string[];
  includedInBooking: boolean;
  isActive: boolean;
  icon: string;
}

export interface Offer {
  id: string;
  name: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minStay: number;
  maxDiscount?: number;
  validFrom?: string;
  validTo?: string;
  eligibleCategories: string[];
  requiresIdVerification: boolean;
  isActive: boolean;
  description: string;
}

export type BookingStatus =
  | 'pending'
  | 'pending_approval'
  | 'new_request'
  | 'awaiting_approval'
  | 'awaiting_admin_approval'
  | 'awaiting_customer_confirmation'
  | 'confirmed'
  | 'payment_pending'
  | 'payment_verification_pending'
  | 'payment_verified'
  | 'paid'
  | 'checkin_due'
  | 'checked_in'
  | 'checkout_due'
  | 'checked_out'
  | 'cancellation_requested'
  | 'cancelled'
  | 'rejected'
  | 'refund_pending'
  | 'refunded'
  | 'completed';

export type PaymentStatus = 'pay_at_property' | 'pending' | 'paid';

export interface BookingHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  performedBy: string;
  note?: string;
}

export interface ProposedBookingChanges {
  roomId: string;
  roomName: string;
  roomCategory: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  reason: string;
  proposedAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface Booking {
  id: string;
  bookingReference: string;
  roomId: string;
  roomName: string;
  roomCategory: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  nights: number;
  basePricePerNight: number;
  roomSubtotal: number;
  discountApplied: number;
  offerCode?: string;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountAmount?: number;
  loyaltyPointsEarned?: number;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: 'pay_at_property' | 'online_razorpay' | 'upi' | 'card';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentVerified?: boolean;
  paymentVerifiedBy?: string;
  paymentVerifiedAt?: string;
  holdId?: string;
  specialRequests?: string;
  customerRequests?: string;
  internalNotes?: string;
  cancellationReason?: string;
  cancellationRequestedAt?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  proposedChanges?: ProposedBookingChanges;
  arrivalStatus?: 'not_arrived' | 'arrived' | 'assistance_requested';
  arrivalNote?: string;
  arrivalReportedAt?: string;
  checkoutRequested?: boolean;
  checkoutRequestedAt?: string;
  actualCheckInTime?: string;
  actualCheckOutTime?: string;
  refundStatus?: 'none' | 'pending' | 'processed' | 'rejected';
  refundAmount?: number;
  bookingHistory?: BookingHistoryItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface PlayAreaSettings {
  id: string;
  morningSession: string;
  afternoonSession: string;
  eveningSession: string;
  slotDurationMinutes: number;
  maxChildrenPerSlot: number;
  minAge: number;
  maxAge: number;
  rules: string[];
  isClosed: boolean;
  closureReason?: string;
  updatedAt?: string;
}

export interface PlayAreaBooking {
  id: string;
  bookingReference: string;
  userId: string;
  parentName: string;
  parentPhone: string;
  roomNumber?: string;
  childName: string;
  childAge: number;
  date: string;
  session: 'morning' | 'afternoon' | 'evening';
  timeSlot: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export interface RooftopPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  durationHours: number;
  availableSlots: string[];
  inclusions: string[];
  conditions: string[];
  isActive: boolean;
}

export interface RooftopBooking {
  id: string;
  packageId: string;
  packageName: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  date: string;
  timeSlot: string;
  guestsCount: number;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  totalAmount: number;
  createdAt: string;
}

export type ExpenseCategory = 
  | 'electricity'
  | 'water'
  | 'internet'
  | 'cleaning'
  | 'laundry'
  | 'staff'
  | 'maintenance'
  | 'supplies'
  | 'marketing'
  | 'repairs'
  | 'other';

export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  description: string;
  receiptUrl?: string;
  enteredBy: string;
  createdAt: string;
}

export interface BusinessSettings {
  id: string;
  businessName: string;
  location: string;
  phone: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
  allowPayAtProperty: boolean;
  publicAdminContact: boolean;
  updatedAt?: string;
}

export interface AIInsight {
  id: string;
  category: string;
  observedCondition: string;
  databaseFigures: Record<string, any>;
  explanation: string;
  suggestedAction: string;
  estimatedImpact?: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  dataLimitations: string;
  status: 'suggested' | 'approved' | 'dismissed';
  createdAt: string;
}

export interface CookNowItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
}

export interface CookNowOrder {
  id: string;
  orderReference: string;
  roomNumber: string;
  guestName: string;
  guestPhone: string;
  items: { itemId: string; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'received' | 'preparing' | 'delivered' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  performedBy: string;
  targetCollection: string;
  targetId: string;
  details: Record<string, any>;
  timestamp: string;
}

export type NotificationType =
  | 'booking'
  | 'payment'
  | 'cancellation'
  | 'checkin'
  | 'checkout'
  | 'arrival'
  | 'proposal'
  | 'loyalty'
  | 'game_reward'
  | 'service_request'
  | 'housekeeping'
  | 'admin_alert'
  | 'play_area'
  | 'rooftop';

export interface NotificationItem {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  bookingId?: string;
  bookingReference?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'new' | 'responded' | 'archived';
  createdAt: string;
}

export interface Attraction {
  id: string;
  name: string;
  category: 'Ghat' | 'Temple' | 'Nature' | 'Adventure' | 'Cafe & Wellness' | 'Yoga & Wellness' | 'Spiritual' | 'Sightseeing' | 'Waterfall' | 'Nature & Wildlife';
  distance: string;
  isDistanceVerified: boolean;
  description: string;
  image?: string;
  location?: string;
  mapLink?: string;
  providerDetails?: string;
  officialBookingLink?: string;
  lastVerifiedDate: string;
}

// ==========================================
// UPGRADE: CUSTOMER SERVICE PORTAL
// ==========================================

export type CustomerServiceCategory =
  | 'room_service'
  | 'guest_convenience'
  | 'food_service'
  | 'other';

export type ServiceRequestStatus =
  | 'submitted'
  | 'received'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ServicePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CustomerServiceRequest {
  id: string;
  bookingReference?: string;
  roomId?: string;
  roomNumber: string;
  userId: string;
  guestName: string;
  guestPhone: string;
  category: CustomerServiceCategory;
  serviceType: string;
  description: string;
  priority: ServicePriority;
  preferredTime?: string;
  status: ServiceRequestStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  rating?: number;
  reviewComment?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

// ==========================================
// UPGRADE: HOUSEKEEPING MANAGEMENT
// ==========================================

export type HousekeepingTaskType =
  | 'routine_cleaning'
  | 'checkout_turnover'
  | 'deep_clean'
  | 'inspection'
  | 'maintenance_fix';

export type HousekeepingStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'needs_review';

export interface HousekeepingTask {
  id: string;
  roomNumber: string;
  roomId?: string;
  taskType: HousekeepingTaskType;
  priority: ServicePriority;
  deadline: string;
  status: HousekeepingStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  notes?: string;
  inspectionPassed?: boolean;
  inspectedBy?: string;
  createdAt: string;
  completedAt?: string;
}

// ==========================================
// UPGRADE: STAFF MANAGEMENT
// ==========================================

export type StaffDesignation =
  | 'Housekeeping'
  | 'Reception'
  | 'Maintenance'
  | 'Guest Assistance'
  | 'Supervisor';

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email?: string;
  designation: StaffDesignation;
  active: boolean;
  responsibilities: string[];
  completedTasksCount: number;
  createdAt: string;
}

// ==========================================
// UPGRADE: ROOM PRICING HISTORY
// ==========================================

export type PriceType =
  | 'standard'
  | 'student'
  | 'couple'
  | 'family'
  | 'long_stay'
  | 'weekend'
  | 'seasonal';

export interface RoomPricingHistory {
  id: string;
  roomId: string;
  roomNumber: string;
  previousPrice: number;
  newPrice: number;
  priceType: PriceType;
  changedBy: string;
  reason: string;
  timestamp: string;
}

// ==========================================
// UPGRADE: CUSTOMER REVIEWS & FEEDBACK
// ==========================================

export interface CustomerFeedback {
  id: string;
  bookingReference?: string;
  guestName: string;
  roomNumber?: string;
  rating: number; // 1-5
  category: 'stay' | 'cleanliness' | 'service' | 'pool' | 'play_area' | 'rooftop';
  comments: string;
  responseByOwner?: string;
  createdAt: string;
}

// ==========================================
// UPGRADE: 3D ROOM VIEWER CONFIGURATION
// ==========================================

export interface Room3DConfig {
  id: string;
  roomId: string;
  roomNumber: string;
  dimensions: {
    width: number; // in meters (e.g. 4.5)
    length: number; // in meters (e.g. 5.5)
    height: number; // in meters (e.g. 3.0)
  };
  bedPosition: {
    x: number;
    z: number;
    type: string;
  };
  hasBalcony: boolean;
  windowView: 'city' | 'hill' | 'garden' | 'standard';
  furniture: string[];
  verified3d: boolean;
  modelLabel: string;
}

// ==========================================
// UPGRADE: COMPARATIVE FINANCIAL METRICS
// ==========================================

export interface ComparativeMetric {
  label: string;
  currentValue: number;
  previousValue: number;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'neutral';
  explanation: string;
  aiRecommendation?: string;
}

export interface SearchFilters {
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  roomsCount: number;
  category: string;
  maxBudget: number;
  viewPreference: 'all' | 'city' | 'hill' | 'garden';
  sortBy?: 'recommended' | 'price_low' | 'price_high' | 'capacity';
  chipFilter?: 'all' | 'family' | 'couple' | 'budget' | 'student' | 'city' | 'top_floor';
  travelerPersona?: TravelerPersona;
}

// ==========================================
// SMART ROOM RECOMMENDATIONS
// ==========================================

export type TravelerPersona =
  | 'all'
  | 'couple'
  | 'family'
  | 'student_remote'
  | 'spiritual_yoga'
  | 'budget_solo';

export interface RoomSmartMatch {
  room: Room;
  matchScore: number; // 0-100
  isTopMatch: boolean;
  personaBadge: string;
  matchReasons: string[];
  highlightedAmenities: string[];
}

// ==========================================
// LOYALTY CUSTOMER REWARDS (Sunlit Rewards Club)
// ==========================================

export type LoyaltyTier = 'explorer' | 'pioneer' | 'patron';

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'adjustment';
  points: number;
  description: string;
  bookingReference?: string;
  timestamp: string;
}

export interface LoyaltyRewardOption {
  id: string;
  name: string;
  pointsRequired: number;
  discountValue: number;
  description: string;
  badge?: string;
}

// ==========================================
// SUNLIT PLAY & EARN (SUNLIT GANGA QUEST)
// ==========================================

export interface GameRewardTier {
  id: string;
  name: string;
  pointsCost: number;
  discountAmount: number;
  description: string;
  minBookingAmount: number;
  eligibleCategories: string[];
  maxDiscount: number;
  badge?: string;
  isActive: boolean;
  campaignName?: string;
  combinable: boolean;
}

export interface UserGameProgress {
  userId: string;
  highScore: number;
  level: number;
  totalTokensCollected: number;
  pointsEarnedToday: number;
  lastPlayedDate: string;
  quizzesCompleted: number;
  pointsBalance: number;
  dailyPointsEarned: number;
}

export interface GameRewardVoucher {
  id: string;
  code: string;
  voucherCode: string;
  userId: string;
  userEmail: string;
  rewardTierId: string;
  rewardName: string;
  discountAmount: number;
  minBookingAmount: number;
  status: 'active' | 'used' | 'expired';
  isUsed: boolean;
  usedInBookingReference?: string;
  createdAt: string;
  expiresAt: string;
}

// ==========================================
// UPGRADE: SUNLIT FESTIVAL MAGIC (15 DYNAMIC THEMES)
// ==========================================

export type FestivalThemeId =
  | 'diwali'
  | 'holi'
  | 'janmashtami'
  | 'christmas'
  | 'newyear'
  | 'navratri'
  | 'dussehra'
  | 'rakshabandhan'
  | 'independenceday'
  | 'republicday'
  | 'valentines'
  | 'summer'
  | 'monsoon'
  | 'winter'
  | 'regular';

export interface FestivalThemeMeta {
  id: FestivalThemeId;
  name: string;
  badge: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgGradient: string;
  bannerMessage: string;
  effectType: 'diyas' | 'colors' | 'peacock' | 'snowfall' | 'confetti' | 'flames' | 'petals' | 'tri_color' | 'monsoon_rain' | 'subtle_glow' | 'none';
  audioEffect?: string;
  defaultDateWindow?: { startMonth: number; startDay: number; endMonth: number; endDay: number };
}

export interface FestivalThemeConfig {
  id?: string;
  activeTheme: FestivalThemeId;
  isAutoScheduled: boolean;
  animationIntensity: 'low' | 'medium' | 'high' | 'off';
  soundEnabled: boolean;
  particlesEnabled?: boolean;
  parallaxEnabled?: boolean;
  mobileThrottlingEnabled?: boolean;
  customGreeting?: string;
  overrideExpiresAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

// ==========================================
// UPGRADE: CUSTOMER MESSAGING / LIVE INBOX
// ==========================================

export type SupportTopic =
  | 'Room Availability'
  | 'Pricing & Offers'
  | 'Facilities & Pool'
  | 'Booking Support'
  | 'CookNow Food'
  | 'Rishikesh Sightseeing'
  | 'General Query';

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'guest' | 'admin' | 'system';
  text: string;
  timestamp: string;
  isRead: boolean;
  suggestedByAI?: boolean;
}

export interface SupportConversation {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  topic: SupportTopic;
  status: 'unread' | 'pending' | 'resolved';
  priority: 'low' | 'normal' | 'urgent';
  bookingReference?: string;
  roomNumber?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCountAdmin: number;
  unreadCountCustomer: number;
  assignedStaffId?: string;
  assignedStaffName?: string;
  internalNotes?: string;
  aiSuggestedReply?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// UPGRADE: 4 PLAYABLE GAMES (SUNLIT PLAY & EARN)
// ==========================================

export type PlayableGameId =
  | 'ganga_quest'
  | 'rishikesh_runner'
  | 'memory_match'
  | 'brain_quest';

export interface GameInfo {
  id: PlayableGameId;
  title: string;
  category: string;
  description: string;
  howToPlay: string;
  rewardPointsPerPlay: number;
  dailyCapPoints: number;
  durationMinutes: number;
  icon: string;
  badge: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  gameId: PlayableGameId;
  highScore: number;
  rank: number;
  achievedAt: string;
}

// ==========================================
// UPGRADE: COOKNOW VISUAL FOOD EXPERIENCE
// ==========================================

export type CookNowCategory =
  | 'Breakfast'
  | 'North Indian Food'
  | 'South Indian Food'
  | 'Chinese'
  | 'Snacks'
  | 'Healthy Food'
  | 'Beverages'
  | 'Desserts'
  | 'Special Meals';

export interface FoodProduct {
  id: string;
  name: string;
  hindiName?: string;
  category: CookNowCategory;
  price: number;
  isVeg: boolean;
  isChefSpecial?: boolean;
  isPopular?: boolean;
  calories?: number;
  preparationMinutes: number;
  description: string;
  image: string;
  fallbackImage: string;
  ingredients: string[];
  allergens: string[];
  spiceLevel: 'Mild' | 'Medium' | 'Spicy';
  available: boolean;
}

export interface FoodCartItem {
  product: FoodProduct;
  quantity: number;
  customization?: string;
}

export interface FoodOrderRecord {
  id: string;
  orderReference: string;
  userId: string;
  guestName: string;
  guestPhone: string;
  roomNumber: string;
  deliveryLocation: 'room' | 'rooftop_deck' | 'poolside';
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
    customization?: string;
  }[];
  subtotal: number;
  deliveryCharge: number;
  tax: number;
  totalAmount: number;
  paymentMethod: 'pay_on_delivery' | 'room_bill';
  paymentStatus: 'pending' | 'settled';
  status: 'received' | 'preparing' | 'on_the_way' | 'delivered' | 'cancelled';
  estimatedMinutes: number;
  specialInstructions?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface GuestIdDocument {
  id?: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  documentType: 'aadhaar' | 'passport' | 'voter_id' | 'driving_license';
  documentNumber: string;
  nationality: 'Indian' | 'Foreign';
  passportExpiry?: string;
  visaNumber?: string;
  formCRequired?: boolean;
  formCSubmitted?: boolean;
  verificationStatus: 'unverified' | 'pending_review' | 'verified' | 'rejected';
  rejectionReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
