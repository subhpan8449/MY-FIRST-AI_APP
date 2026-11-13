import React, { useState, useEffect } from 'react';
import {
  Booking,
  NotificationItem,
  CustomerServiceRequest,
  PlayAreaBooking,
  RooftopBooking,
  GuestIdDocument
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getUserBookings,
  updateBookingStatus,
  getUserNotifications,
  getUserServiceRequests,
  getPlayAreaBookings,
  getRooftopBookings,
  submitCustomerFeedback,
  respondToProposedChanges,
  notifyGuestArrival,
  requestCheckInAssistance,
  requestCheckOutAssistance,
  requestBookingCancellation,
  markAllNotificationsAsRead,
  getGuestIdDocument,
  saveGuestIdDocument
} from '../services/db';
import {
  getUserLoyaltySummary,
  UserLoyaltySummary,
  LOYALTY_TIERS,
  LOYALTY_REWARD_OPTIONS
} from '../services/loyaltyService';
import {
  X,
  Calendar,
  AlertCircle,
  Bell,
  Star,
  Printer,
  FileText,
  ArrowLeft,
  Award,
  Coins,
  Gift,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  HelpCircle,
  Send,
  Luggage,
  LogOut
} from 'lucide-react';

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenServiceModal?: () => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  onOpenServiceModal
}) => {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'bookings' | 'loyalty' | 'services' | 'play-area' | 'rooftop' | 'feedback' | 'notifications' | 'guide' | 'id-verification'
  >('bookings');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [serviceRequests, setServiceRequests] = useState<CustomerServiceRequest[]>([]);
  const [userPlayBookings, setUserPlayBookings] = useState<PlayAreaBooking[]>([]);
  const [userRooftopBookings, setUserRooftopBookings] = useState<RooftopBooking[]>([]);
  const [loyaltySummary, setLoyaltySummary] = useState<UserLoyaltySummary | null>(null);

  // Guest ID Document Verification state
  const [guestDoc, setGuestDoc] = useState<GuestIdDocument | null>(null);
  const [docType, setDocType] = useState<'aadhaar' | 'passport' | 'voter_id' | 'driving_license'>('aadhaar');
  const [docNumber, setDocNumber] = useState('');
  const [docNationality, setDocNationality] = useState<'Indian' | 'Foreign'>('Indian');
  const [docGuestName, setDocGuestName] = useState(userProfile?.fullName || '');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [visaNumber, setVisaNumber] = useState('');
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);
  const [cancellationTarget, setCancellationTarget] = useState<Booking | null>(null);
  const [cancellationReasonText, setCancellationReasonText] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Feedback form
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackCategory, setFeedbackCategory] = useState<'stay' | 'cleanliness' | 'service' | 'pool' | 'play_area' | 'rooftop'>('stay');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackRoomNumber, setFeedbackRoomNumber] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState('');

  const showSuccess = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 4000);
  };

  const loadData = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [bList, nList, sList, pList, rList, lSummary, gDoc] = await Promise.all([
        getUserBookings(currentUser.uid),
        getUserNotifications(currentUser.uid),
        getUserServiceRequests(currentUser.uid),
        getPlayAreaBookings(),
        getRooftopBookings(),
        getUserLoyaltySummary(currentUser.uid),
        getGuestIdDocument(currentUser.uid)
      ]);
      setBookings(bList);
      if (gDoc) {
        setGuestDoc(gDoc);
        setDocType(gDoc.documentType);
        setDocNumber(gDoc.documentNumber);
        setDocNationality(gDoc.nationality);
        setDocGuestName(gDoc.guestName);
        if (gDoc.passportExpiry) setPassportExpiry(gDoc.passportExpiry);
        if (gDoc.visaNumber) setVisaNumber(gDoc.visaNumber);
      }
      setNotifications(nList);
      setServiceRequests(sList);
      setUserPlayBookings(pList.filter(p => p.userId === currentUser.uid));
      setUserRooftopBookings(rList.filter(r => r.userId === currentUser.uid));
      setLoyaltySummary(lSummary);
    } catch (err: any) {
      console.error('Error loading guest portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      loadData();
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleAcceptProposal = async (bookingId: string) => {
    try {
      await respondToProposedChanges(bookingId, true, currentUser?.email || 'guest');
      showSuccess('You accepted the proposed room/dates! Reservation is confirmed.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept changes');
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!docNumber.trim()) {
      setActionError('Please enter a valid document number.');
      return;
    }
    setIsSavingDoc(true);
    setActionError('');
    try {
      const nowIso = new Date().toISOString();
      const updatedDoc: GuestIdDocument = {
        userId: currentUser.uid,
        guestName: docGuestName.trim() || userProfile?.fullName || 'Valued Guest',
        guestEmail: currentUser.email || '',
        guestPhone: userProfile?.phone || '',
        documentType: docType,
        documentNumber: docNumber.trim().toUpperCase(),
        nationality: docNationality,
        passportExpiry: docNationality === 'Foreign' ? passportExpiry : undefined,
        visaNumber: docNationality === 'Foreign' ? visaNumber : undefined,
        formCRequired: docNationality === 'Foreign',
        formCSubmitted: docNationality === 'Foreign',
        verificationStatus: guestDoc?.verificationStatus === 'verified' ? 'verified' : 'pending_review',
        createdAt: guestDoc?.createdAt || nowIso,
        updatedAt: nowIso
      };
      await saveGuestIdDocument(updatedDoc);
      setGuestDoc(updatedDoc);
      showSuccess('Government ID registered successfully! Express check-in is enabled for your stay.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to save ID document');
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeclineProposal = async (bookingId: string) => {
    try {
      await respondToProposedChanges(bookingId, false, currentUser?.email || 'guest');
      showSuccess('Proposal declined. Team notified to review your original preference.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to decline proposal');
    }
  };

  const handleNotifyArrivalAction = async (booking: Booking) => {
    try {
      await notifyGuestArrival(booking.id, booking.guestName);
      showSuccess('Arrival signal sent! Front desk notified that you are at Devashish Homestay.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Could not notify arrival');
    }
  };

  const handleCheckInAssistanceAction = async (booking: Booking) => {
    try {
      await requestCheckInAssistance(booking.id, booking.guestName);
      showSuccess('Luggage & check-in assistance requested! Staff is on their way.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Could not request check-in assistance');
    }
  };

  const handleCheckOutAssistanceAction = async (booking: Booking) => {
    try {
      await requestCheckOutAssistance(booking.id, booking.guestName);
      showSuccess('Checkout requested! Front desk is settling receipt & housekeeping alerted.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Could not request checkout assistance');
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancellationTarget) return;
    setIsSubmittingCancellation(true);
    setActionError('');
    try {
      await requestBookingCancellation(
        cancellationTarget.id,
        cancellationReasonText || 'Guest requested cancellation',
        currentUser?.email || 'guest'
      );
      showSuccess(`Cancellation request submitted for ${cancellationTarget.bookingReference}.`);
      setCancellationTarget(null);
      setCancellationReasonText('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Could not submit cancellation request');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    try {
      await markAllNotificationsAsRead(currentUser.uid);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showSuccess('All notifications marked as read.');
    } catch (err: any) {
      console.error('Error marking alerts read:', err);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComments.trim()) return;

    try {
      await submitCustomerFeedback({
        guestName: userProfile?.fullName || currentUser?.displayName || 'Guest',
        roomNumber: feedbackRoomNumber || undefined,
        rating: feedbackRating,
        category: feedbackCategory,
        comments: feedbackComments.trim()
      });
      setFeedbackSuccess(true);
      setFeedbackComments('');
      setTimeout(() => setFeedbackSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  const currentPoints = loyaltySummary?.points ?? (userProfile?.loyaltyPoints || 0);
  const currentTier = loyaltySummary?.tier ?? (userProfile?.loyaltyTier || 'explorer');
  const tierInfo = LOYALTY_TIERS[currentTier] || LOYALTY_TIERS.explorer;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Top Header with Back Navigation and Breadcrumbs */}
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-stone-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Return to Devashish Homestay Website"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Homestay</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-amber-200/80 font-medium">Home &gt; Guest Portal</span>
                <span className="text-stone-400">·</span>
                <h3 className="text-sm sm:text-base font-bold text-white">Guest Hub &amp; Reservations</h3>
                <span className="text-[10px] bg-amber-800 text-amber-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Tapovan
                </span>
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">{currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-stone-200 hover:text-white"
            aria-label="Close Portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 px-6 bg-stone-50 overflow-x-auto shrink-0 text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Bookings ({bookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('loyalty')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'loyalty'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-amber-700 hover:text-amber-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Sunlit Rewards Club</span>
            <span className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0.2 rounded font-bold">
              {currentPoints} pts
            </span>
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'services'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Service Requests ({serviceRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('play-area')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'play-area'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Play Area ({userPlayBookings.length})
          </button>

          <button
            onClick={() => setActiveTab('rooftop')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'rooftop'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Rooftop ({userRooftopBookings.length})
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'feedback'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Submit Feedback
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts ({notifications.filter(n => !n.isRead).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-amber-700 hover:text-amber-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Digital Guest Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('id-verification')}
            className={`py-3 px-3.5 border-b-2 whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'id-verification'
                ? 'border-amber-700 text-amber-900 bg-white font-bold'
                : 'border-transparent text-emerald-800 hover:text-emerald-950'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Digital ID &amp; Check-In</span>
            {guestDoc?.verificationStatus === 'verified' ? (
              <span className="bg-emerald-100 text-emerald-900 text-[9px] px-1.5 py-0.2 rounded font-bold">
                Verified
              </span>
            ) : guestDoc ? (
              <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.2 rounded font-bold">
                Pending
              </span>
            ) : (
              <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.2 rounded font-bold">
                Required
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {actionError && (
            <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* TAB 1: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-10 text-stone-400">Loading your reservations...</div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 space-y-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <Calendar className="w-10 h-10 text-stone-300 mx-auto" />
                  <h4 className="text-sm font-bold text-stone-800">No Reservations Found</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    You have not made any room reservations yet. Explore our sunlit Himalayan rooms in Tapovan.
                  </p>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                  >
                    <span>Browse Available Rooms</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                bookings.map((booking) => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isCheckInDayOrLater = booking.checkInDate <= todayStr && todayStr <= booking.checkOutDate;
                  const canCancel = ['pending', 'awaiting_admin_approval', 'awaiting_customer_confirmation', 'confirmed', 'payment_pending', 'payment_verified'].includes(booking.status);

                  return (
                    <div
                      key={booking.id}
                      className={`border rounded-xl p-4 bg-white transition-all shadow-xs space-y-3 ${
                        booking.status === 'awaiting_customer_confirmation'
                          ? 'border-amber-400 ring-2 ring-amber-200'
                          : 'border-stone-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-stone-900">{booking.roomName}</span>
                            <span className="font-mono text-[11px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                              {booking.bookingReference}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500">{booking.roomCategory}</span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            booking.status === 'confirmed' || booking.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : booking.status === 'checked_in'
                              ? 'bg-blue-100 text-blue-800'
                              : booking.status === 'checked_out'
                              ? 'bg-stone-200 text-stone-700'
                              : booking.status === 'awaiting_customer_confirmation'
                              ? 'bg-amber-500 text-white animate-pulse'
                              : booking.status === 'awaiting_admin_approval'
                              ? 'bg-amber-100 text-amber-900'
                              : booking.status === 'cancellation_requested'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {booking.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* PROPOSED CHANGES BANNER */}
                      {booking.status === 'awaiting_customer_confirmation' && booking.proposedChanges && (
                        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl space-y-2.5">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Homestay Team Proposed Changes to Your Reservation</span>
                          </div>
                          <p className="text-[11px] text-stone-700 italic bg-white/70 p-2 rounded-lg border border-amber-200">
                            "{booking.proposedChanges.reason}"
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-white p-2.5 rounded-lg border border-amber-200">
                            <div>
                              <span className="block text-stone-400 text-[10px]">Proposed Room</span>
                              <span className="font-semibold text-stone-900">{booking.proposedChanges.roomName}</span>
                            </div>
                            <div>
                              <span className="block text-stone-400 text-[10px]">Proposed Check-In</span>
                              <span className="font-semibold text-stone-900">{booking.proposedChanges.checkInDate}</span>
                            </div>
                            <div>
                              <span className="block text-stone-400 text-[10px]">Proposed Check-Out</span>
                              <span className="font-semibold text-stone-900">{booking.proposedChanges.checkOutDate}</span>
                            </div>
                            <div>
                              <span className="block text-stone-400 text-[10px]">Proposed Total</span>
                              <span className="font-bold text-amber-900">₹{booking.proposedChanges.totalAmount}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleAcceptProposal(booking.id)}
                              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Accept Proposed Room/Dates</span>
                            </button>
                            <button
                              onClick={() => handleDeclineProposal(booking.id)}
                              className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-semibold text-xs cursor-pointer"
                            >
                              <span>Decline Proposal</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* AWAITING ADMIN APPROVAL NOTICE */}
                      {booking.status === 'awaiting_admin_approval' && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2 text-[11px]">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Your reservation request is under review by Devashish Front Desk. Confirmation will appear here shortly.</span>
                        </div>
                      )}

                      {/* CANCELLATION REQUESTED NOTICE */}
                      {booking.status === 'cancellation_requested' && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center gap-2 text-[11px]">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <div>
                            <span className="font-semibold">Cancellation requested. </span>
                            <span>Front desk is processing your request under our 48-hour cancellation policy.</span>
                            {booking.cancellationReason && (
                              <div className="text-[10px] text-rose-700 mt-0.5">Reason: "{booking.cancellationReason}"</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* REJECTION REASON */}
                      {booking.status === 'rejected' && booking.rejectionReason && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-900 text-[11px]">
                          <span className="font-semibold">Declined by property: </span>
                          <span>{booking.rejectionReason}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-200">
                        <div>
                          <span className="block text-[10px] text-stone-400 uppercase font-bold">Check-In</span>
                          <span className="font-semibold text-stone-800">{booking.checkInDate}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 uppercase font-bold">Check-Out</span>
                          <span className="font-semibold text-stone-800">{booking.checkOutDate}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 uppercase font-bold">Stay Details</span>
                          <span className="font-semibold text-stone-800">
                            {booking.adults} Adults · {booking.nights} Night(s)
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-stone-400 uppercase font-bold">Total Amount</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-900">₹{booking.totalAmount}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              booking.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {booking.paymentStatus === 'paid' ? 'Paid' : 'Pay At Property'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ON-PROPERTY GUEST ACTIONS FOR ACTIVE STAYS */}
                      {booking.status === 'confirmed' && (
                        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-stone-700">Stay Day Front Desk Actions:</span>
                            {isCheckInDayOrLater && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                                Check-in Window Open
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {booking.arrivalStatus === 'arrived' ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Arrival Signaled to Front Desk</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleNotifyArrivalAction(booking)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>I Have Arrived at Property</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleCheckInAssistanceAction(booking)}
                              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <Luggage className="w-3.5 h-3.5" />
                              <span>Request Luggage / Check-In Help</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {booking.status === 'checked_in' && (
                        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-900">Current In-House Guest:</span>
                            <span className="text-[10px] text-blue-800 bg-blue-100 px-2 py-0.5 rounded font-semibold">Active Stay</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {booking.checkoutRequested ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold border border-blue-300">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Checkout Requested — Front Desk & Housekeeping Notified</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleCheckOutAssistanceAction(booking)}
                                className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Request Checkout & Luggage Help</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Loyalty Points Info on Booking */}
                      <div className="flex flex-wrap items-center gap-3 bg-amber-50/60 border border-amber-100 px-3 py-1.5 rounded-lg text-[11px] text-amber-900">
                        {booking.loyaltyPointsEarned && booking.loyaltyPointsEarned > 0 ? (
                          <span className="flex items-center gap-1 font-semibold text-emerald-700">
                            <Coins className="w-3.5 h-3.5" />
                            Earned +{booking.loyaltyPointsEarned} Sunlit Points
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-800">
                            <Coins className="w-3.5 h-3.5 text-amber-600" />
                            Earns ~{Math.floor((booking.totalAmount / 100) * 10)} pts upon completed stay
                          </span>
                        )}
                        {booking.loyaltyPointsRedeemed && booking.loyaltyPointsRedeemed > 0 && (
                          <span className="flex items-center gap-1 text-purple-700 font-semibold">
                            <Gift className="w-3.5 h-3.5" />
                            Redeemed {booking.loyaltyPointsRedeemed} pts (-₹{booking.loyaltyDiscountAmount})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setSelectedInvoiceBooking(booking)}
                          className="text-amber-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Invoice Receipt</span>
                        </button>

                        {canCancel && booking.status !== 'cancellation_requested' && (
                          <button
                            onClick={() => setCancellationTarget(booking)}
                            className="text-red-600 hover:text-red-800 hover:underline cursor-pointer text-[11px] font-semibold"
                          >
                            Cancel Reservation
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: SUNLIT REWARDS CLUB */}
          {activeTab === 'loyalty' && (
            <div className="space-y-6">
              {/* Member Tier Header Card */}
              <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-stone-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-300" />
                        <h4 className="text-lg font-extrabold tracking-tight">Sunlit Rewards Club</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/20 text-amber-200 border border-amber-300/30">
                          {tierInfo.name}
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/80 mt-1">
                        Exclusive guest privileges and stay savings for Devashish Homestay guests
                      </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 text-right">
                      <span className="text-[10px] text-amber-200 uppercase font-bold tracking-wider block">Available Balance</span>
                      <div className="flex items-baseline gap-1 justify-end">
                        <span className="text-2xl font-black text-amber-300">{currentPoints}</span>
                        <span className="text-xs font-bold text-amber-200">Points</span>
                      </div>
                      <span className="text-[11px] text-stone-200">Value: ₹{(currentPoints * 0.5).toFixed(0)} Stay Credit</span>
                    </div>
                  </div>

                  {/* Tier Progress */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs text-amber-200/90 font-medium">
                      <span>Tier: <strong className="text-white">{tierInfo.name}</strong></span>
                      {loyaltySummary && loyaltySummary.nextTierPointsNeeded > 0 ? (
                        <span>{loyaltySummary.nextTierPointsNeeded} points to next tier</span>
                      ) : (
                        <span className="text-amber-300 font-bold">Highest Tier Achieved!</span>
                      )}
                    </div>
                    <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-amber-200 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(10, (currentPoints / 1500) * 100))}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-amber-300/60 font-semibold pt-0.5">
                      <span>Explorer (0 pts)</span>
                      <span>Ganga Pioneer (500 pts)</span>
                      <span>Himalayan Patron (1500+ pts)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* How to Earn & Redeem Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-700" />
                    <h5 className="font-bold text-stone-900 text-xs">How You Earn Points</h5>
                  </div>
                  <ul className="space-y-1.5 text-stone-600 text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-700 font-bold">✓</span>
                      <span><strong>{tierInfo.pointsRate} points per ₹100</strong> spent on all direct room bookings.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-700 font-bold">✓</span>
                      <span>Points credited automatically to your account upon checkout confirmation.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-700 font-bold">✓</span>
                      <span>Bonus points awarded for customer reviews and rooftop yoga sessions.</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-700" />
                    <h5 className="font-bold text-stone-900 text-xs">How to Redeem</h5>
                  </div>
                  <ul className="space-y-1.5 text-stone-600 text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <span className="text-purple-700 font-bold">✓</span>
                      <span>Apply points during <strong>Step 4: Payment</strong> for instant rupee deductions.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-purple-700 font-bold">✓</span>
                      <span>100 pts = ₹50 discount · 200 pts = ₹100 · 500 pts = ₹250 instant off.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-purple-700 font-bold">✓</span>
                      <span>Can be combined with seasonal promo codes for maximum savings!</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Reward Redemption Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Instant Stay Rewards (Redeemable in Booking Checkout)</span>
                  </h5>
                  <span className="text-[11px] text-stone-500">100 pts = ₹50 credit</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {LOYALTY_REWARD_OPTIONS.map((rew) => {
                    const canAfford = currentPoints >= rew.pointsRequired;
                    return (
                      <div
                        key={rew.id}
                        className={`rounded-xl p-3.5 border transition-all ${
                          canAfford
                            ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                            : 'bg-stone-50/50 border-stone-200 opacity-75'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-stone-900 text-xs">{rew.name}</span>
                          {rew.badge && (
                            <span className="text-[9px] bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                              {rew.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 mb-2">{rew.description}</p>
                        <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                          <span className="text-xs font-mono font-bold text-amber-900">
                            🪙 {rew.pointsRequired} pts
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            canAfford ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {canAfford ? 'Ready to use' : `Need ${rew.pointsRequired - currentPoints} more`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tier Privileges Grid */}
              <div className="space-y-3 pt-2">
                <h5 className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-stone-700" />
                  <span>Member Tier Benefits</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['explorer', 'pioneer', 'patron'] as const).map((tierKey) => {
                    const t = LOYALTY_TIERS[tierKey];
                    const isCurrent = currentTier === tierKey;
                    return (
                      <div
                        key={tierKey}
                        className={`p-4 rounded-xl border space-y-2.5 ${
                          isCurrent
                            ? 'bg-amber-50/50 border-amber-400 ring-2 ring-amber-300/40'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h6 className="font-bold text-xs text-stone-900">{t.name}</h6>
                          {isCurrent && (
                            <span className="text-[10px] bg-amber-800 text-amber-100 font-bold px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">
                          {t.minPoints === 0 ? 'Entry Tier' : `${t.minPoints}+ points`} · {t.pointsRate} pts/₹100
                        </div>
                        <ul className="space-y-1.5 text-[10px] text-stone-600">
                          {t.perks.map((p, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-amber-700 font-bold">·</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transaction Activity */}
              {loyaltySummary && loyaltySummary.transactions && loyaltySummary.transactions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-200">
                  <h5 className="font-bold text-stone-900 text-xs">Points Ledger &amp; Activity</h5>
                  <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden bg-white">
                    {loyaltySummary.transactions.map((tx) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-stone-800">{tx.description}</p>
                          <span className="text-[10px] text-stone-400">
                            {new Date(tx.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <span
                          className={`font-mono font-bold ${
                            tx.type === 'earned' || tx.type === 'bonus'
                              ? 'text-emerald-700'
                              : 'text-purple-700'
                          }`}
                        >
                          {tx.type === 'earned' || tx.type === 'bonus' ? '+' : '-'}
                          {tx.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-stone-800">Your Active Service Requests</h4>
                {onOpenServiceModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenServiceModal();
                    }}
                    className="px-3 py-1 bg-amber-800 text-white rounded-lg text-xs font-bold hover:bg-amber-900 cursor-pointer"
                  >
                    + New Request
                  </button>
                )}
              </div>
              {serviceRequests.length === 0 ? (
                <div className="text-center py-10 text-stone-400">No service requests recorded.</div>
              ) : (
                serviceRequests.map((req) => (
                  <div key={req.id} className="p-3 border rounded-xl bg-stone-50/50 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{req.serviceType}</span>
                        <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                          {req.category}
                        </span>
                      </div>
                      <p className="text-stone-600 mt-1">{req.description}</p>
                      <div className="text-[10px] text-stone-400 mt-1">
                        Requested: {new Date(req.createdAt).toLocaleString()} {req.roomNumber && `· Room ${req.roomNumber}`}
                      </div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded font-bold uppercase ${
                      req.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: PLAY AREA */}
          {activeTab === 'play-area' && (
            <div className="space-y-3">
              {userPlayBookings.length === 0 ? (
                <div className="text-center py-10 text-stone-400">No play area slot reservations yet.</div>
              ) : (
                userPlayBookings.map((b) => (
                  <div key={b.id} className="p-3 border rounded-xl bg-stone-50/50 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-stone-900">{b.date} · {b.timeSlot}</div>
                      <p className="text-stone-600 text-[11px]">
                        Child: {b.childName} ({b.childAge} yrs) · Guardian: {b.parentName}
                      </p>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded uppercase">
                      {b.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: ROOFTOP */}
          {activeTab === 'rooftop' && (
            <div className="space-y-3">
              {userRooftopBookings.length === 0 ? (
                <div className="text-center py-10 text-stone-400">No rooftop experiences booked.</div>
              ) : (
                userRooftopBookings.map((b) => (
                  <div key={b.id} className="p-3 border rounded-xl bg-stone-50/50 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-stone-900">{b.packageName} · {b.date}</div>
                      <p className="text-stone-600 text-[11px]">{b.guestsCount} Guests · {b.timeSlot}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-900">₹{b.totalAmount}</span>
                      <span className="block text-[10px] text-emerald-800 font-bold uppercase">{b.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 6: FEEDBACK */}
          {activeTab === 'feedback' && (
            <form onSubmit={handleSubmitFeedback} className="space-y-3 max-w-lg mx-auto bg-stone-50 p-4 rounded-xl border">
              <h4 className="font-bold text-stone-900 text-sm">Tell Us About Your Experience</h4>
              <p className="text-stone-500 text-[11px]">Help us keep Devashish Homestay the cleanest, sunniest haven in Rishikesh.</p>

              {feedbackSuccess && (
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                  Thank you! Your feedback has been forwarded to the owners and will be reviewed.
                </div>
              )}

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${feedbackRating >= star ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">Category</label>
                  <select
                    value={feedbackCategory}
                    onChange={(e: any) => setFeedbackCategory(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-white text-xs"
                  >
                    <option value="stay">Overall Homestay</option>
                    <option value="cleanliness">Room Cleanliness</option>
                    <option value="service">Host Service</option>
                    <option value="pool">Swimming Pool</option>
                    <option value="play_area">Kids Play Area</option>
                    <option value="rooftop">Rooftop View</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">Room Number (optional)</label>
                  <input
                    type="text"
                    value={feedbackRoomNumber}
                    onChange={(e) => setFeedbackRoomNumber(e.target.value)}
                    placeholder="e.g. 201"
                    className="w-full border rounded-lg p-2 bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Comments / Suggestions</label>
                <textarea
                  value={feedbackComments}
                  onChange={(e) => setFeedbackComments(e.target.value)}
                  rows={3}
                  placeholder="Share details of your stay..."
                  className="w-full border rounded-lg p-2 bg-white text-xs"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
              >
                Submit Feedback
              </button>
            </form>
          )}

          {/* TAB 7: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="font-bold text-stone-800">Homestay Alerts &amp; Updates</span>
                {notifications.some(n => !n.isRead) && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-amber-800 hover:text-amber-950 font-semibold text-xs cursor-pointer hover:underline"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-10 text-stone-400">No alerts or stay notifications.</div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                      n.isRead ? 'bg-stone-50 border-stone-200' : 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200'
                    }`}
                  >
                    <Bell className={`w-4 h-4 shrink-0 mt-0.5 ${n.isRead ? 'text-stone-400' : 'text-amber-700'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between font-bold text-stone-900">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-stone-400">{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-stone-600 mt-0.5">{n.message}</p>
                      {n.bookingId && (
                        <button
                          onClick={() => setActiveTab('bookings')}
                          className="mt-1 text-amber-800 font-semibold text-[10px] hover:underline cursor-pointer"
                        >
                          View Reservation →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 8: DIGITAL GUEST GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Welcome banner */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200 text-amber-900">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">Devashish Sunlit Homestay Digital Guest Guide</h4>
                    <p className="text-[11px] text-stone-600">Essential property info, facility timings, Wi-Fi, and Tapovan travel tips.</p>
                  </div>
                </div>
              </div>

              {/* Grid of Key Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Wi-Fi */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs">📶 High-Speed Optical Wi-Fi</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">100 Mbps</span>
                  </div>
                  <p className="text-[11px] text-stone-600">Complimentary optical fiber Wi-Fi across all rooms, balconies, and rooftop.</p>
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-2.5 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Network:</span>
                      <strong className="text-stone-900">Devashish_Sunlit_Guest</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Password:</span>
                      <strong className="text-amber-800">SunlitTapovan2026</strong>
                    </div>
                  </div>
                </div>

                {/* Swimming Pool */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs">🏊 Swimming Pool Access</span>
                    <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-bold">Complimentary</span>
                  </div>
                  <p className="text-[11px] text-stone-600">Outdoor freshwater pool maintained daily with pure mountain spring water.</p>
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-2.5 text-[11px] space-y-1 text-stone-600">
                    <div>• <strong>Hours:</strong> 7:00 AM to 7:00 PM Daily</div>
                    <div>• <strong>Rules:</strong> Proper swimwear required; shower before entering.</div>
                  </div>
                </div>

                {/* Kids Play Area */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs">🧸 Children's Indoor Play Area</span>
                    <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">Ages 2-12</span>
                  </div>
                  <p className="text-[11px] text-stone-600">Safe, soft-mat indoor zone with slides, ball pool, building blocks, and games.</p>
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-2.5 text-[11px] space-y-1 text-stone-600">
                    <div>• <strong>Morning:</strong> 8:30 AM – 11:30 AM</div>
                    <div>• <strong>Evening:</strong> 4:00 PM – 8:00 PM (Parental supervision requested)</div>
                  </div>
                </div>

                {/* Rooftop City & Sunset View */}
                <div className="rounded-2xl border border-stone-200 bg-white p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs">🌅 Rooftop Sunset Deck</span>
                    <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-[10px] font-bold">3rd Floor</span>
                  </div>
                  <p className="text-[11px] text-stone-600">Panoramic views of Rishikesh city lights and sunset mountain ridges.</p>
                  <div className="rounded-xl bg-stone-50 border border-stone-200 p-2.5 text-[11px] space-y-1 text-stone-600">
                    <div>• <strong>Open:</strong> 6:00 AM – 10:30 PM</div>
                    <div>• <strong>Dining:</strong> CookNow food delivery available to rooftop tables.</div>
                  </div>
                </div>
              </div>

              {/* Host Contact & Emergencies */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <span className="font-bold text-stone-900 text-xs block">📞 Host Desk &amp; Medical Emergency</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-700">
                  <div>
                    <span className="text-stone-500 block">Host &amp; Front Desk:</span>
                    <strong>Subhashish Pandey: +91 9897335265</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Nearest 24x7 Multi-Specialty Hospital:</span>
                    <strong>AIIMS Rishikesh (15 mins drive, dial 108)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: DIGITAL GUEST ID & STATUTORY CHECK-IN DESK */}
          {activeTab === 'id-verification' && (
            <div className="space-y-5 max-w-2xl mx-auto">
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-emerald-800" />
                    <h4 className="font-bold text-stone-900 text-sm">
                      Government ID Verification &amp; Contactless Check-In Desk
                    </h4>
                  </div>
                  {guestDoc?.verificationStatus === 'verified' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      Verified
                    </span>
                  ) : guestDoc?.verificationStatus === 'pending_review' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-700" />
                      Under Review
                    </span>
                  ) : guestDoc?.verificationStatus === 'rejected' ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-700" />
                      Action Required
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                      Not Submitted
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  In compliance with Uttarakhand Tourism and Indian Hospitality Statutory Guidelines, all staying guests must present valid government photo identification. Registering now ensures fast, queue-free key handover upon your arrival at Tapovan.
                </p>
              </div>

              {/* Status Notice Banner */}
              {guestDoc?.verificationStatus === 'verified' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold text-emerald-950 block">Identity Officially Verified</span>
                    <p className="text-stone-700">
                      Verified by host reception on {guestDoc.verifiedAt ? new Date(guestDoc.verifiedAt).toLocaleDateString('en-IN') : 'Arrival'}. Your room key is pre-authorized for express handover.
                    </p>
                  </div>
                </div>
              )}

              {guestDoc?.verificationStatus === 'rejected' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs">
                    <span className="font-bold text-rose-950 block">Document Revision Requested</span>
                    <p className="text-stone-700">
                      Note from host: &ldquo;{guestDoc.rejectionReason || 'Document details were unclear. Please update your document number or full legal name.'}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* ID Registration Form */}
              <form onSubmit={handleSaveDocument} className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
                <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>Guest Identification Details</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Legal Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Full Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={docGuestName}
                      onChange={e => setDocGuestName(e.target.value)}
                      placeholder="As printed on government ID"
                      required
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>

                  {/* Nationality */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Nationality <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={docNationality}
                      onChange={e => {
                        const val = e.target.value as 'Indian' | 'Foreign';
                        setDocNationality(val);
                        if (val === 'Foreign') setDocType('passport');
                      }}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-600 outline-none"
                    >
                      <option value="Indian">Indian Resident / Citizen</option>
                      <option value="Foreign">International Traveler (Foreign National)</option>
                    </select>
                  </div>

                  {/* Document Type */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Document Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={docType}
                      onChange={e => setDocType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-600 outline-none"
                    >
                      {docNationality === 'Indian' ? (
                        <>
                          <option value="aadhaar">Aadhaar Card</option>
                          <option value="driving_license">Driving License</option>
                          <option value="voter_id">Voter ID Card</option>
                          <option value="passport">Indian Passport</option>
                        </>
                      ) : (
                        <option value="passport">International Passport</option>
                      )}
                    </select>
                  </div>

                  {/* Document Number */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-stone-700">
                      Document Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={e => setDocNumber(e.target.value)}
                      placeholder={
                        docType === 'aadhaar'
                          ? '12-digit Aadhaar number'
                          : docType === 'passport'
                          ? 'Passport booklet number'
                          : 'Government document ID'
                      }
                      required
                      className="w-full px-3 py-2 font-mono uppercase border border-stone-300 rounded-xl text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-amber-600 outline-none"
                    />
                  </div>
                </div>

                {/* International Foreign National Fields */}
                {docNationality === 'Foreign' && (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                    <span className="font-bold text-amber-900 block text-xs">
                      Form C Statutory Compliance (Bureau of Immigration India)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-700">Passport Expiry Date</label>
                        <input
                          type="date"
                          value={passportExpiry}
                          onChange={e => setPassportExpiry(e.target.value)}
                          className="w-full px-3 py-1.5 border border-stone-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-stone-700">Indian Visa / eVisa Number</label>
                        <input
                          type="text"
                          value={visaNumber}
                          onChange={e => setVisaNumber(e.target.value)}
                          placeholder="e.g. V1234567"
                          className="w-full px-3 py-1.5 font-mono uppercase border border-stone-300 rounded-lg text-xs bg-white"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Homestay management will submit Form C arrival registration to the Rishikesh Foreigners Regional Registration Office (FRRO).
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                  <span className="text-[11px] text-stone-500">
                    Encrypted &amp; securely stored in Firebase Firestore
                  </span>
                  <button
                    type="submit"
                    disabled={isSavingDoc}
                    className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isSavingDoc ? 'Submitting...' : 'Register ID for Express Check-In'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* INVOICE MODAL VIEWER WITH EXPLICIT BACK BUTTON */}
        {selectedInvoiceBooking && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border shadow-2xl text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedInvoiceBooking(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md font-semibold text-xs cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Bookings</span>
                  </button>
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-sm">DEVASHISH HOMESTAY</h4>
                    <p className="text-[10px] text-stone-500">Tapovan, Rishikesh, Uttarakhand</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInvoiceBooking(null)}
                  className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Invoice / Booking Ref:</span>
                  <span className="font-mono font-bold text-stone-900">{selectedInvoiceBooking.bookingReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Guest Name:</span>
                  <span className="font-semibold text-stone-900">{selectedInvoiceBooking.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Room:</span>
                  <span className="text-stone-800">{selectedInvoiceBooking.roomName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Stay Duration:</span>
                  <span className="text-stone-800">{selectedInvoiceBooking.checkInDate} to {selectedInvoiceBooking.checkOutDate} ({selectedInvoiceBooking.nights} night(s))</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Nightly Rate:</span>
                  <span className="text-stone-800">₹{selectedInvoiceBooking.basePricePerNight}</span>
                </div>
                {selectedInvoiceBooking.discountApplied > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount Applied ({selectedInvoiceBooking.offerCode}):</span>
                    <span>-₹{selectedInvoiceBooking.discountApplied}</span>
                  </div>
                )}
                {selectedInvoiceBooking.loyaltyDiscountAmount && selectedInvoiceBooking.loyaltyDiscountAmount > 0 && (
                  <div className="flex justify-between text-purple-700 font-semibold">
                    <span>Sunlit Rewards Redemption ({selectedInvoiceBooking.loyaltyPointsRedeemed} pts):</span>
                    <span>-₹{selectedInvoiceBooking.loyaltyDiscountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-stone-900 pt-2 border-t">
                  <span>Total Amount Paid / Payable:</span>
                  <span>₹{selectedInvoiceBooking.totalAmount}</span>
                </div>
                {selectedInvoiceBooking.loyaltyPointsEarned && selectedInvoiceBooking.loyaltyPointsEarned > 0 && (
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 font-semibold flex items-center justify-between text-[11px]">
                    <span>Points Credited for this stay:</span>
                    <span className="font-mono font-bold">+{selectedInvoiceBooking.loyaltyPointsEarned} pts</span>
                  </div>
                )}
                <div className="text-[10px] text-stone-500 pt-1">
                  * Swimming pool and kids play area access included at no additional charge.
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 pt-2 border-t">
                <button
                  onClick={() => setSelectedInvoiceBooking(null)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-xs cursor-pointer"
                >
                  ← Close Receipt
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CANCELLATION REQUEST MODAL */}
        {cancellationTarget && (
          <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200 text-xs">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <h4 className="font-bold text-stone-900 text-sm">Request Reservation Cancellation</h4>
                </div>
                <button
                  onClick={() => setCancellationTarget(null)}
                  className="text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl space-y-1.5 border border-stone-200">
                <div className="flex justify-between">
                  <span className="text-stone-500">Booking Ref:</span>
                  <span className="font-mono font-bold text-stone-900">{cancellationTarget.bookingReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Room:</span>
                  <span className="font-semibold text-stone-800">{cancellationTarget.roomName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Dates:</span>
                  <span className="text-stone-800">{cancellationTarget.checkInDate} to {cancellationTarget.checkOutDate}</span>
                </div>
              </div>

              {/* Policy Disclosure */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1 text-stone-700">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Devashish Homestay Cancellation Policy</span>
                </div>
                <p className="text-[11px] text-stone-600">
                  • 100% full refund if cancelled at least 48 hours before scheduled check-in date.
                  <br />
                  • Within 48 hours of check-in, 1 night retention fee applies.
                  <br />
                  • Refunds are reviewed and processed within 24-48 business hours.
                </p>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Reason for Cancellation <span className="text-stone-400 text-[10px]">(optional)</span>
                </label>
                <textarea
                  value={cancellationReasonText}
                  onChange={e => setCancellationReasonText(e.target.value)}
                  placeholder="e.g., Change of travel plans, flight reschedule, emergency..."
                  rows={3}
                  className="w-full border border-stone-300 rounded-lg p-2.5 bg-stone-50 focus:bg-white text-xs outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setCancellationTarget(null)}
                  className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-semibold cursor-pointer"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  disabled={isSubmittingCancellation}
                  onClick={handleConfirmCancellation}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingCancellation ? 'Submitting...' : 'Confirm Cancellation Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Success Toast Notice */}
        {actionSuccessNotice && (
          <div className="fixed bottom-6 right-6 z-80 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-stone-700 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
};
