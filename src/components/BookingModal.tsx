import React, { useState, useEffect } from 'react';
import { Room, Offer } from '../types';
import { useAuth } from '../context/AuthContext';
import { createBooking, getOffers } from '../services/db';
import {
  calculateServerPrice,
  createInventoryHold,
  releaseInventoryHold,
  getPaymentConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  PaymentConfig
} from '../services/bookingApi';
import {
  X,
  Calendar,
  Users,
  Tag,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Building,
  Printer,
  Clock,
  Sparkles,
  Phone,
  Mail,
  User,
  Info,
  Award,
  Gift
} from 'lucide-react';
import {
  getUserLoyaltySummary,
  calculatePointsToEarn,
  redeemPointsForBooking,
  awardPointsForBooking,
  LOYALTY_REWARD_OPTIONS,
  UserLoyaltySummary
} from '../services/loyaltyService';
import { computeSmartMatch } from '../services/recommendationEngine';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRoom: Room | null;
  rooms: Room[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  onBookingSuccess: (bookingRef: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  selectedRoom,
  rooms,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  onBookingSuccess,
}) => {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 3);

  const [roomId, setRoomId] = useState<string>(selectedRoom?.id || rooms[0]?.id || '');
  const [checkInDate, setCheckInDate] = useState<string>(
    initialCheckIn || tomorrow.toISOString().split('T')[0]
  );
  const [checkOutDate, setCheckOutDate] = useState<string>(
    initialCheckOut || dayAfter.toISOString().split('T')[0]
  );
  const [adults, setAdults] = useState<number>(initialGuests > 0 ? initialGuests : 2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [guestName, setGuestName] = useState<string>(userProfile?.fullName || '');
  const [guestEmail, setGuestEmail] = useState<string>(userProfile?.email || '');
  const [guestPhone, setGuestPhone] = useState<string>(userProfile?.phone || '');
  const [idType, setIdType] = useState<string>('Aadhaar Card');
  const [idNumber, setIdNumber] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  // Promo Code
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; name: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string>('');
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);

  // Payment configuration & methods
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    available: false,
    keyId: null,
    testMode: true,
    allowPayAtProperty: true
  });
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_property' | 'online_razorpay'>('pay_at_property');

  // 5-Step Process: Step 1 (Search Room), Step 2 (Select Room), Step 3 (Guest Details), Step 4 (Payment), Step 5 (Confirmation)
  const [currentStep, setCurrentStep] = useState<'select_room' | 'guest_details' | 'payment' | 'confirmed'>('select_room');

  // Server Calculated Price State
  const [nights, setNights] = useState<number>(1);
  const [roomSubtotal, setRoomSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [finalTotal, setFinalTotal] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Loyalty Rewards State
  const [userLoyalty, setUserLoyalty] = useState<UserLoyaltySummary | null>(null);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState<number>(0);

  // Hold State
  const [currentHoldId, setCurrentHoldId] = useState<string | null>(null);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState<{
    reference: string;
    roomName: string;
    totalAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    checkIn: string;
    checkOut: string;
    nights: number;
  } | null>(null);

  // Sync selectedRoom prop
  useEffect(() => {
    if (selectedRoom) {
      setRoomId(selectedRoom.id);
    } else if (rooms.length > 0 && !roomId) {
      setRoomId(rooms[0].id);
    }
  }, [selectedRoom, rooms]);

  // Sync user profile
  useEffect(() => {
    if (userProfile) {
      if (!guestName) setGuestName(userProfile.fullName);
      if (!guestEmail) setGuestEmail(userProfile.email);
      if (!guestPhone && userProfile.phone) setGuestPhone(userProfile.phone);
    }
  }, [userProfile]);

  // Load user loyalty profile
  useEffect(() => {
    if (currentUser?.uid) {
      getUserLoyaltySummary(currentUser.uid).then(setUserLoyalty).catch(console.error);
    } else {
      setUserLoyalty(null);
      setRedeemPoints(0);
      setLoyaltyDiscount(0);
    }
  }, [currentUser]);

  // Load payment config & active offers
  useEffect(() => {
    getPaymentConfig().then(setPaymentConfig).catch(console.error);
    getOffers().then(offs => setAvailableOffers(offs.filter(o => o.isActive))).catch(console.error);
  }, []);

  const currentRoom = rooms.find(r => r.id === roomId) || selectedRoom || rooms[0];
  const payableTotal = Math.max(0, finalTotal - loyaltyDiscount);
  const pointsToEarn = calculatePointsToEarn(payableTotal, userLoyalty?.tier || 'explorer');
  const smartMatch = currentRoom ? computeSmartMatch(currentRoom, 'all', { adults, children: childrenCount }) : null;

  // Recalculate server price whenever room, dates, or promo changes
  const runPriceCalculation = async () => {
    if (!currentRoom) return;
    setIsCalculating(true);
    try {
      const basePrice = currentRoom.specialPrice || currentRoom.basePrice || 999;
      const res = await calculateServerPrice({
        basePrice,
        checkInDate,
        checkOutDate,
        promoCode: promoCode.trim().toUpperCase()
      });
      setNights(res.nights);
      setRoomSubtotal(res.roomSubtotal);
      setDiscountAmount(res.discountAmount);
      setFinalTotal(res.finalTotal);
      if (res.appliedPromo) {
        setAppliedPromo(res.appliedPromo);
        setPromoError('');
      } else if (promoCode.trim()) {
        setAppliedPromo(null);
        setPromoError('Coupon code not applicable for this stay');
      } else {
        setAppliedPromo(null);
        setPromoError('');
      }
    } catch (err: any) {
      console.warn('Server price calculation fallback:', err);
      // Client fallback math
      const inD = new Date(checkInDate);
      const outD = new Date(checkOutDate);
      const diff = Math.max(1, Math.ceil((outD.getTime() - inD.getTime()) / 86400000));
      const rate = currentRoom.specialPrice || currentRoom.basePrice || 999;
      setNights(diff);
      setRoomSubtotal(rate * diff);
      setFinalTotal(rate * diff);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentRoom && checkInDate && checkOutDate) {
      runPriceCalculation();
    }
  }, [isOpen, roomId, checkInDate, checkOutDate]);

  if (!isOpen) return null;

  const handleApplyPromoBtn = () => {
    runPriceCalculation();
  };

  const handleProceedToGuestDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      setErrorMessage('Check-out date must be at least one day after check-in date.');
      return;
    }

    if (adults + childrenCount > (currentRoom?.totalCapacity || 4)) {
      setErrorMessage(`Selected room accommodates maximum ${currentRoom?.totalCapacity} guests.`);
      return;
    }

    setCurrentStep('guest_details');
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('Please connect with Google or Email before proceeding to secure reservation.');
      return;
    }

    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setErrorMessage('Please provide your full name, email, and mobile phone number.');
      return;
    }

    // Create 15-minute temporary inventory hold
    try {
      const hold = await createInventoryHold({
        roomId: currentRoom.id,
        checkInDate,
        checkOutDate,
        userId: currentUser.uid
      });
      setCurrentHoldId(hold.holdId);
      setCurrentStep('payment');
    } catch (err: any) {
      setErrorMessage(err.message || 'Room is currently being reserved by another guest. Please choose another room.');
    }
  };

  const handleBackToRoomSelection = () => {
    setErrorMessage('');
    setCurrentStep('select_room');
  };

  const handleBackToSearch = () => {
    if (currentHoldId) {
      releaseInventoryHold(currentHoldId);
      setCurrentHoldId(null);
    }
    onClose();
    const elem = document.getElementById('search-panel') || document.getElementById('rooms');
    if (elem) elem.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFinalizeBooking = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (paymentMethod === 'online_razorpay') {
        // Step 1: Create order on server
        const orderRes = await createRazorpayOrder({
          amount: payableTotal,
          bookingReference: `DSH-${checkInDate.replace(/-/g, '')}`,
          guestEmail,
          guestPhone
        });

        // Step 2: Check Gateway status without simulated payments
        if (orderRes.gatewayPending || !paymentConfig.keyId) {
          setIsSubmitting(false);
          setErrorMessage(
            'Payment Gateway Setup Pending: Online payment gateway is awaiting official Razorpay API keys from owner Subhashish Pandey. Your room can be confirmed immediately with "Pay at Property upon arrival" at 0 advance charge!'
          );
          setPaymentMethod('pay_at_property');
          return;
        } else {
          // Live Razorpay SDK checkout
          const loadScript = (src: string) =>
            new Promise((resolve) => {
              const script = document.createElement('script');
              script.src = src;
              script.onload = () => resolve(true);
              script.onerror = () => resolve(false);
              document.body.appendChild(script);
            });

          const isLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
          if (!isLoaded) {
            throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
          }

          const options = {
            key: paymentConfig.keyId,
            amount: orderRes.amount,
            currency: 'INR',
            name: 'Devashish Sunlit Homestay',
            description: `Room Booking: ${currentRoom.name} (${nights} night(s))`,
            order_id: orderRes.orderId,
            prefill: {
              name: guestName,
              email: guestEmail,
              contact: guestPhone
            },
            theme: { color: '#78350f' },
            handler: async (response: any) => {
              try {
                const verifyRes = await verifyRazorpayPayment({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature
                });

                if (!verifyRes.verified) {
                  throw new Error('Payment signature verification failed.');
                }

                const bookingResult = await createBooking({
                  roomId: currentRoom.id,
                  roomName: currentRoom.name,
                  roomCategory: currentRoom.category,
                  userId: currentUser!.uid,
                  guestName,
                  guestEmail,
                  guestPhone,
                  checkInDate,
                  checkOutDate,
                  adults,
                  children: childrenCount,
                  nights,
                  basePricePerNight: currentRoom.specialPrice || currentRoom.basePrice,
                  roomSubtotal,
                  discountApplied: discountAmount + loyaltyDiscount,
                  offerCode: appliedPromo?.code || '',
                  loyaltyPointsRedeemed: redeemPoints,
                  loyaltyDiscountAmount: loyaltyDiscount,
                  loyaltyPointsEarned: pointsToEarn,
                  totalAmount: payableTotal,
                  paymentStatus: 'paid',
                  paymentMethod: 'online_razorpay',
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  paymentVerified: true,
                  specialRequests: [specialRequests, `ID: ${idType} ${idNumber}`].filter(Boolean).join(' | '),
                  status: 'confirmed'
                });

                if (redeemPoints > 0) {
                  await redeemPointsForBooking(currentUser!.uid, redeemPoints, loyaltyDiscount, bookingResult.bookingReference);
                }
                await awardPointsForBooking(currentUser!.uid, payableTotal, bookingResult.bookingReference);

                if (currentHoldId) await releaseInventoryHold(currentHoldId);

                setConfirmedBooking({
                  reference: bookingResult.bookingReference,
                  roomName: currentRoom.name,
                  totalAmount: payableTotal,
                  paymentStatus: 'Paid Online',
                  paymentMethod: 'Razorpay Online',
                  checkIn: checkInDate,
                  checkOut: checkOutDate,
                  nights
                });
                setCurrentStep('confirmed');
                onBookingSuccess(bookingResult.bookingReference);
              } catch (e: any) {
                setErrorMessage(e.message || 'Payment verification failed');
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        }
      } else {
        // Pay at Property Booking
        const bookingResult = await createBooking({
          roomId: currentRoom.id,
          roomName: currentRoom.name,
          roomCategory: currentRoom.category,
          userId: currentUser!.uid,
          guestName,
          guestEmail,
          guestPhone,
          checkInDate,
          checkOutDate,
          adults,
          children: childrenCount,
          nights,
          basePricePerNight: currentRoom.specialPrice || currentRoom.basePrice,
          roomSubtotal,
          discountApplied: discountAmount + loyaltyDiscount,
          offerCode: appliedPromo?.code || '',
          loyaltyPointsRedeemed: redeemPoints,
          loyaltyDiscountAmount: loyaltyDiscount,
          loyaltyPointsEarned: pointsToEarn,
          totalAmount: payableTotal,
          paymentStatus: 'pay_at_property',
          paymentMethod: 'pay_at_property',
          specialRequests: [specialRequests, `ID: ${idType} ${idNumber}`].filter(Boolean).join(' | '),
          status: 'pending'
        });

        if (redeemPoints > 0) {
          await redeemPointsForBooking(currentUser!.uid, redeemPoints, loyaltyDiscount, bookingResult.bookingReference);
        }
        await awardPointsForBooking(currentUser!.uid, payableTotal, bookingResult.bookingReference);

        if (currentHoldId) await releaseInventoryHold(currentHoldId);

        setConfirmedBooking({
          reference: bookingResult.bookingReference,
          roomName: currentRoom.name,
          totalAmount: payableTotal,
          paymentStatus: 'Pending (Pay at Property upon Check-in)',
          paymentMethod: 'Pay at Property (Cash / UPI on arrival)',
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights
        });
        setCurrentStep('confirmed');
        onBookingSuccess(bookingResult.bookingReference);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelHoldAndBack = async () => {
    if (currentHoldId) {
      await releaseInventoryHold(currentHoldId);
      setCurrentHoldId(null);
    }
    setCurrentStep('guest_details');
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case 'select_room': return 2;
      case 'guest_details': return 3;
      case 'payment': return 4;
      case 'confirmed': return 5;
      default: return 2;
    }
  };

  const stepLabels = [
    { num: 1, name: 'Search Room', onClick: handleBackToSearch },
    { num: 2, name: 'Select Room', onClick: () => currentStep !== 'select_room' && currentStep !== 'confirmed' ? handleBackToRoomSelection() : undefined },
    { num: 3, name: 'Guest Details', onClick: () => currentStep === 'payment' ? handleCancelHoldAndBack() : undefined },
    { num: 4, name: 'Payment', onClick: undefined },
    { num: 5, name: 'Confirmation', onClick: undefined }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold">Devashish Sunlit Homestay</h2>
              <span className="text-[10px] bg-amber-700/80 text-amber-200 px-2 py-0.5 rounded font-bold uppercase">
                Tapovan, Rishikesh
              </span>
            </div>
            <p className="text-xs text-amber-200 mt-0.5">
              Clean · Sunlit · Swimming Pool & Kids Play Area Included
            </p>
          </div>
          <button
            onClick={() => {
              if (currentHoldId) releaseInventoryHold(currentHoldId);
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumb Navigation & 5-Step Process Bar */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-2.5 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-stone-500 mb-2">
            <div className="flex items-center gap-1 font-medium">
              <span className="hover:text-amber-800 cursor-pointer" onClick={handleBackToSearch}>Home</span>
              <span>&gt;</span>
              <span className="hover:text-amber-800 cursor-pointer" onClick={handleBackToSearch}>Rooms</span>
              <span>&gt;</span>
              <span className="text-stone-800 font-bold">
                {currentStep === 'select_room' && 'Step 2: Room & Dates'}
                {currentStep === 'guest_details' && 'Step 3: Guest Information'}
                {currentStep === 'payment' && 'Step 4: Payment Option'}
                {currentStep === 'confirmed' && 'Step 5: Confirmation'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
              Step {getStepNumber()} of 5
            </span>
          </div>

          {/* 5-Step Progress Indicators */}
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-[10px] font-semibold text-center">
            {stepLabels.map((st) => {
              const currentNum = getStepNumber();
              const isPast = st.num < currentNum;
              const isCurrent = st.num === currentNum;
              return (
                <button
                  key={st.num}
                  type="button"
                  onClick={st.onClick}
                  disabled={!st.onClick}
                  className={`py-1.5 px-1 rounded-lg border transition-all flex flex-col items-center gap-0.5 ${
                    isCurrent
                      ? 'bg-amber-800 text-white border-amber-900 shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer hover:bg-emerald-100'
                      : 'bg-white text-stone-400 border-stone-200 cursor-default'
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-wider block">
                    {isPast ? '✓ ' : ''}Step {st.num}
                  </span>
                  <span className="truncate w-full block text-[10px] font-bold">
                    {st.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: CONFIRMATION & RECEIPT */}
        {currentStep === 'confirmed' && confirmedBooking ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-5 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-stone-900">
                {confirmedBooking.paymentStatus.includes('Paid') ? 'Reservation Confirmed!' : 'Booking Request Logged!'}
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-md mx-auto">
                Thank you, <span className="font-bold text-stone-800">{guestName}</span>. Your reservation has been recorded in the Devashish Sunlit Homestay registry.
              </p>
            </div>

            {/* Printable Receipt Card */}
            <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 sm:p-5 text-left text-xs space-y-2.5 max-w-md mx-auto">
              <div className="flex justify-between items-baseline pb-2 border-b border-stone-200">
                <span className="text-stone-500 font-semibold">Booking Reference:</span>
                <span className="font-mono text-sm font-bold text-amber-950 bg-amber-100 px-2 py-0.5 rounded">
                  {confirmedBooking.reference}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-500">Reserved Room:</span>
                <span className="font-bold text-stone-900">{confirmedBooking.roomName}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-500">Stay Dates:</span>
                <span className="font-semibold text-stone-800">
                  {confirmedBooking.checkIn} to {confirmedBooking.checkOut} ({confirmedBooking.nights} night(s))
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-500">Guests:</span>
                <span className="text-stone-800 font-medium">
                  {adults} Adult{adults > 1 ? 's' : ''} {childrenCount > 0 ? `· ${childrenCount} Child` : ''}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-stone-500">Payment Option:</span>
                <span className="font-medium text-stone-800">{confirmedBooking.paymentMethod}</span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-stone-200 text-sm">
                <span className="font-bold text-stone-900">Total Amount:</span>
                <span className="font-extrabold text-amber-950 text-base">₹{confirmedBooking.totalAmount}</span>
              </div>

              <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                <p>✓ Leisure swimming pool privileges included.</p>
                <p>✓ Children's play area access included for staying families.</p>
                <p>✓ Check-in time: 12:00 PM · Check-out time: 11:00 AM.</p>
                <p>📍 Location: Tapovan, Rishikesh (Near Laxman Jhula Bypass).</p>
                <p>📞 Host Subhashish Pandey: +91 9897335265 / subhpan8449@gmail.com</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice Receipt</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-sm cursor-pointer"
              >
                Close & View My Bookings
              </button>
            </div>
          </div>
        ) : currentStep === 'payment' ? (
          // STEP 2: PAYMENT METHOD SELECTION & VERIFICATION
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Hold Banner */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-bold">Room Held for 15 Minutes: </span>
                <span>We are temporarily reserving {currentRoom?.name} exclusively for you to complete checkout.</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Summary Box */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Room & Duration:</span>
                <span className="font-semibold text-stone-900">
                  {currentRoom?.name} ({nights} night{nights > 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Dates:</span>
                <span className="font-medium text-stone-800">{checkInDate} to {checkOutDate}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Primary Guest:</span>
                <span className="font-medium text-stone-800">{guestName} ({guestPhone})</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Promo Discount ({appliedPromo?.code}):</span>
                  <span>-₹{discountAmount}</span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Sunlit Rewards Redemption ({redeemPoints} Pts):</span>
                  <span>-₹{loyaltyDiscount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline text-sm">
                <div>
                  <span className="font-bold text-stone-900">Total Due:</span>
                  <span className="block text-[11px] text-amber-800 font-bold mt-0.5">
                    🪙 You earn +{pointsToEarn} Sunlit Points
                  </span>
                </div>
                <span className="text-xl font-extrabold text-amber-950">₹{payableTotal}</span>
              </div>
            </div>

            {/* Loyalty Rewards Points Redemption (Sunlit Rewards Club) */}
            {userLoyalty && userLoyalty.points >= 100 && (
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <Award className="w-4 h-4 text-amber-700" />
                    <span>Sunlit Rewards Club ({userLoyalty.tierInfo.name})</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold bg-white text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                    Balance: {userLoyalty.points} Pts
                  </span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Redeem your member loyalty points for an instant booking discount:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRedeemPoints(0);
                      setLoyaltyDiscount(0);
                    }}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      redeemPoints === 0
                        ? 'bg-amber-800 text-white border-amber-900 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span className="block font-bold text-[11px]">No Points</span>
                    <span className="text-[10px] opacity-75">Pay standard</span>
                  </button>
                  {LOYALTY_REWARD_OPTIONS.filter(o => o.pointsRequired <= userLoyalty.points).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setRedeemPoints(opt.pointsRequired);
                        setLoyaltyDiscount(opt.discountValue);
                      }}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        redeemPoints === opt.pointsRequired
                          ? 'bg-amber-800 text-white border-amber-900 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <span className="block font-bold text-[11px]">Use {opt.pointsRequired} Pts</span>
                      <span className={`text-[10px] font-bold block ${redeemPoints === opt.pointsRequired ? 'text-amber-200' : 'text-emerald-700'}`}>
                        Save ₹{opt.discountValue}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Select Payment Mode */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Choose Payment Option
              </h4>

              {/* Option A: Online Razorpay */}
              <label
                onClick={() => setPaymentMethod('online_razorpay')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'online_razorpay'
                    ? 'border-amber-700 bg-amber-50/50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMethod === 'online_razorpay'}
                  onChange={() => setPaymentMethod('online_razorpay')}
                  className="mt-1 accent-amber-700"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-amber-800" />
                      <span>Online Payment (UPI, Cards, NetBanking, Wallets)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Instant Confirmation
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Pay securely with Google Pay, PhonePe, Paytm, BHIM UPI, debit or credit card.
                    {paymentConfig.gatewayPending && (
                      <span className="text-amber-800 font-semibold block mt-0.5">
                        * Payment Gateway Setup Pending: Awaiting Razorpay keys from owner Subhashish Pandey. Please choose "Pay at Property" below for instant room confirmation with zero upfront payment.
                      </span>
                    )}
                  </p>
                </div>
              </label>

              {/* Option B: Pay at Property */}
              <label
                onClick={() => setPaymentMethod('pay_at_property')}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'pay_at_property'
                    ? 'border-amber-700 bg-amber-50/50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  checked={paymentMethod === 'pay_at_property'}
                  onChange={() => setPaymentMethod('pay_at_property')}
                  className="mt-1 accent-amber-700"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-amber-800" />
                      <span>Pay at Property (Homestay Arrival)</span>
                    </span>
                    <span className="text-[10px] bg-stone-100 text-stone-700 font-semibold px-2 py-0.5 rounded">
                      Subject to Host Approval
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Settle your bill in cash or via UPI at the reception upon check-in. Host Subhashish Pandey will review and confirm availability.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelHoldAndBack}
                disabled={isSubmitting}
                className="w-1/3 py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                ← Back to Guest Details
              </button>
              <button
                type="button"
                onClick={handleFinalizeBooking}
                disabled={isSubmitting}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Processing Reservation...</span>
                ) : (
                  <span>
                    {paymentMethod === 'online_razorpay'
                      ? `Pay ₹${payableTotal} & Confirm Stay`
                      : `Submit Request (Pay ₹${payableTotal} on Arrival)`}
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : currentStep === 'guest_details' ? (
          // STEP 3: GUEST INFORMATION & VERIFICATION
          <form onSubmit={handleProceedToPayment} className="p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Step 3: Guest Details & Verification</h3>
                <p className="text-[11px] text-stone-500">Provide official contact information for Uttarakhand hospitality check-in compliance</p>
              </div>
              <button
                type="button"
                onClick={handleBackToRoomSelection}
                className="text-xs text-amber-800 font-bold hover:underline cursor-pointer"
              >
                ← Back to Room & Dates
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Stay Overview Banner */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold">{currentRoom?.name} (Room #{currentRoom?.roomNumber})</span>
                <span className="text-stone-600 block text-[11px] mt-0.5">
                  {checkInDate} to {checkOutDate} ({nights} night{nights > 1 ? 's' : ''}) · {adults} Adult{adults > 1 ? 's' : ''} {childrenCount > 0 ? `· ${childrenCount} Child` : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 uppercase block">Total Due</span>
                <span className="text-sm font-black text-amber-950">₹{finalTotal}</span>
              </div>
            </div>

            {/* Guest Authentication Banner */}
            {!currentUser ? (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-amber-950">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    <span>Quick Login with Google</span>
                  </p>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    Sign in to track your reservation, download receipts, and earn Sunlit Rewards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => loginWithGoogle().catch(() => {})}
                  className="px-4 py-2 text-xs font-bold bg-white text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-50 shadow-xs cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                  <span>Connect with Google</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Guest'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover border border-emerald-400 shrink-0"
                    />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  )}
                  <span className="font-semibold truncate">Signed in with Google: {currentUser.email}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 shrink-0">Verified</span>
              </div>
            )}

            {/* Guest Contact Details */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">WhatsApp / Phone *</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>
              </div>

              {/* ID Proof Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">ID Type (For Check-in)</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Student ID Card">Student ID (Required for STUDENT500)</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Pilgrim Yatra Pass">Char Dham / Pilgrim Registration Pass</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">ID Number (Optional)</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. XXXX-XXXX-1234"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Special Requests or Arrival Notes (Optional)
                </label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Ground floor preference, quiet corner, estimated arrival time after 2 PM..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToRoomSelection}
                className="w-1/3 py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                ← Back to Room & Dates
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to Payment & Review →</span>
              </button>
            </div>
          </form>
        ) : (
          // STEP 2: ROOM SELECTION, DATES & OFFERS
          <form onSubmit={handleProceedToGuestDetails} className="p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Step 2: Select Room & Dates</h3>
                <p className="text-[11px] text-stone-500">Pick room category, stay duration, and apply seasonal discounts</p>
              </div>
              <button
                type="button"
                onClick={handleBackToSearch}
                className="text-xs text-amber-800 font-bold hover:underline cursor-pointer"
              >
                ← Back to Room Search
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Room Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700">Select Room</label>
              <select
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  setPromoCode('');
                  setAppliedPromo(null);
                }}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 font-medium"
                required
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} - {r.name} ({r.category}) · ₹{r.specialPrice || r.basePrice}/night {r.viewType === 'city' ? '★ City View' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates & Guests */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Check-In</span>
                </label>
                <input
                  type="date"
                  value={checkInDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Check-Out</span>
                </label>
                <input
                  type="date"
                  value={checkOutDate}
                  min={checkInDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  <span>Guests</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-1/2 px-2 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} Adlt</option>
                    ))}
                  </select>
                  <select
                    value={childrenCount}
                    onChange={(e) => setChildrenCount(Number(e.target.value))}
                    className="w-1/2 px-2 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    {[0, 1, 2, 3].map(n => (
                      <option key={n} value={n}>{n} Chld</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Promo Code & Discounts */}
            <div className="pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Apply Promo Code (e.g. STUDENT500, LONGSTAY20, SUNLITCOUPLE, PILGRIM10)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 px-3 py-1.5 text-xs uppercase bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
                <button
                  type="button"
                  onClick={handleApplyPromoBtn}
                  className="px-4 py-1.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer"
                >
                  Apply Code
                </button>
              </div>

              {promoError && <p className="text-[11px] text-red-600 mt-1">{promoError}</p>}
              {appliedPromo && (
                <p className="text-[11px] text-emerald-700 mt-1 font-bold">
                  ✓ {appliedPromo.name} applied: ₹{appliedPromo.discount} savings!
                </p>
              )}
            </div>

            {/* Transparent Server Price Breakdown */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Room Rate (₹{currentRoom?.specialPrice || currentRoom?.basePrice} × {nights} night{nights > 1 ? 's' : ''})</span>
                <span className="font-semibold text-stone-900 tabular-nums">₹{roomSubtotal}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Promo Discount ({appliedPromo?.code})</span>
                  <span className="tabular-nums">-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Swimming Pool & Kids Play Area</span>
                <span className="text-emerald-700 font-bold">Included (₹0)</span>
              </div>
              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline text-sm">
                <span className="font-bold text-stone-900">Total Payable</span>
                <span className="text-xl font-extrabold text-amber-950 tabular-nums">
                  {isCalculating ? 'Calculating...' : `₹${finalTotal}`}
                </span>
              </div>
            </div>

            {/* Actions for Step 2 */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleBackToSearch}
                className="w-1/3 py-2.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                ← Back to Search
              </button>
              <button
                type="submit"
                disabled={isCalculating}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to Guest Details →</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
