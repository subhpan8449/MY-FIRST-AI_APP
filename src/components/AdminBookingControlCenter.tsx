import React, { useState } from 'react';
import {
  Booking,
  BookingStatus,
  ProposedBookingChanges,
  Room
} from '../types';
import {
  approveBooking,
  rejectBooking,
  proposeBookingChanges,
  resolveCancellationRequest,
  verifyBookingPayment,
  checkInGuest,
  checkOutGuest,
  addBookingInternalNote,
  createNotification
} from '../services/db';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  UserMinus,
  MessageSquare,
  FileText,
  DollarSign,
  Calendar,
  Send,
  Phone,
  Mail,
  User,
  Bed,
  History,
  X
} from 'lucide-react';

interface AdminBookingControlCenterProps {
  bookings: Booking[];
  rooms: Room[];
  adminEmail: string;
  onRefresh: () => void;
  onSelectBookingForInvoice?: (booking: Booking) => void;
}

export type BookingControlTab =
  | 'new_requests'
  | 'awaiting_approval'
  | 'awaiting_customer'
  | 'confirmed'
  | 'payment_pending'
  | 'payment_verified'
  | 'checkin_today'
  | 'checked_in'
  | 'checkout_today'
  | 'checked_out'
  | 'cancellation_requests'
  | 'cancelled'
  | 'rejected'
  | 'refund_pending'
  | 'completed';

export const AdminBookingControlCenter: React.FC<AdminBookingControlCenterProps> = ({
  bookings,
  rooms,
  adminEmail,
  onRefresh,
  onSelectBookingForInvoice
}) => {
  const [activeTab, setActiveTab] = useState<BookingControlTab>('new_requests');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Modal action states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposedRoomId, setProposedRoomId] = useState('');
  const [proposedCheckIn, setProposedCheckIn] = useState('');
  const [proposedCheckOut, setProposedCheckOut] = useState('');
  const [proposedPrice, setProposedPrice] = useState(0);
  const [proposalReason, setProposalReason] = useState('');

  const [showNoteModal, setShowNoteModal] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState('');

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [customMessageTitle, setCustomMessageTitle] = useState('');
  const [customMessageText, setCustomMessageText] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter categorization
  const getTabCount = (tab: BookingControlTab): number => {
    switch (tab) {
      case 'new_requests':
        return bookings.filter(b => b.status === 'pending_approval' || b.status === 'pending').length;
      case 'awaiting_approval':
        return bookings.filter(b => b.status === 'pending' || b.status === 'pending_approval' || b.status === 'cancellation_requested').length;
      case 'awaiting_customer':
        return bookings.filter(b => b.status === 'awaiting_customer_confirmation').length;
      case 'confirmed':
        return bookings.filter(b => b.status === 'confirmed').length;
      case 'payment_pending':
        return bookings.filter(b => b.paymentStatus !== 'paid' && b.status !== 'cancelled' && b.status !== 'rejected').length;
      case 'payment_verified':
        return bookings.filter(b => b.paymentStatus === 'paid' || b.paymentVerified).length;
      case 'checkin_today':
        return bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.checkInDate === todayStr).length;
      case 'checked_in':
        return bookings.filter(b => b.status === 'checked_in').length;
      case 'checkout_today':
        return bookings.filter(b => b.status === 'checked_in' && b.checkOutDate === todayStr).length;
      case 'checked_out':
        return bookings.filter(b => b.status === 'checked_out').length;
      case 'cancellation_requests':
        return bookings.filter(b => b.status === 'cancellation_requested').length;
      case 'cancelled':
        return bookings.filter(b => b.status === 'cancelled').length;
      case 'rejected':
        return bookings.filter(b => b.status === 'rejected').length;
      case 'refund_pending':
        return bookings.filter(b => b.refundStatus === 'pending').length;
      case 'completed':
        return bookings.filter(b => b.status === 'completed' || b.status === 'checked_out').length;
      default:
        return 0;
    }
  };

  const filteredBookings = bookings.filter(b => {
    // Tab filter
    let matchesTab = false;
    switch (activeTab) {
      case 'new_requests':
        matchesTab = b.status === 'pending_approval' || b.status === 'pending';
        break;
      case 'awaiting_approval':
        matchesTab = b.status === 'pending' || b.status === 'pending_approval' || b.status === 'cancellation_requested';
        break;
      case 'awaiting_customer':
        matchesTab = b.status === 'awaiting_customer_confirmation';
        break;
      case 'confirmed':
        matchesTab = b.status === 'confirmed';
        break;
      case 'payment_pending':
        matchesTab = b.paymentStatus !== 'paid' && b.status !== 'cancelled' && b.status !== 'rejected';
        break;
      case 'payment_verified':
        matchesTab = b.paymentStatus === 'paid' || Boolean(b.paymentVerified);
        break;
      case 'checkin_today':
        matchesTab = (b.status === 'confirmed' || b.status === 'pending') && b.checkInDate === todayStr;
        break;
      case 'checked_in':
        matchesTab = b.status === 'checked_in';
        break;
      case 'checkout_today':
        matchesTab = b.status === 'checked_in' && b.checkOutDate === todayStr;
        break;
      case 'checked_out':
        matchesTab = b.status === 'checked_out';
        break;
      case 'cancellation_requests':
        matchesTab = b.status === 'cancellation_requested';
        break;
      case 'cancelled':
        matchesTab = b.status === 'cancelled';
        break;
      case 'rejected':
        matchesTab = b.status === 'rejected';
        break;
      case 'refund_pending':
        matchesTab = b.refundStatus === 'pending';
        break;
      case 'completed':
        matchesTab = b.status === 'completed' || b.status === 'checked_out';
        break;
    }

    if (!matchesTab) return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.bookingReference.toLowerCase().includes(q) ||
      b.guestName.toLowerCase().includes(q) ||
      b.guestEmail.toLowerCase().includes(q) ||
      b.guestPhone.toLowerCase().includes(q) ||
      b.roomName.toLowerCase().includes(q)
    );
  });

  // Action Handlers
  const handleApprove = async (b: Booking) => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      await approveBooking(b.id, adminEmail);
      setActionFeedback({ type: 'success', text: `Reservation ${b.bookingReference} approved successfully.` });
      onRefresh();
      if (selectedBooking?.id === b.id) setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to approve booking' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenReject = (b: Booking) => {
    setSelectedBooking(b);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedBooking || !rejectReason.trim()) return;
    setIsProcessing(true);
    try {
      await rejectBooking(selectedBooking.id, adminEmail, rejectReason.trim());
      setActionFeedback({ type: 'success', text: `Booking ${selectedBooking.bookingReference} rejected.` });
      setShowRejectModal(false);
      onRefresh();
      setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to reject booking' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenPropose = (b: Booking) => {
    setSelectedBooking(b);
    setProposedRoomId(b.roomId);
    setProposedCheckIn(b.checkInDate);
    setProposedCheckOut(b.checkOutDate);
    setProposedPrice(b.totalAmount);
    setProposalReason('');
    setShowProposeModal(true);
  };

  const handleConfirmPropose = async () => {
    if (!selectedBooking || !proposalReason.trim() || !proposedRoomId) return;
    const targetRoom = rooms.find(r => r.id === proposedRoomId);
    if (!targetRoom) return;

    setIsProcessing(true);
    try {
      const proposal: ProposedBookingChanges = {
        roomId: targetRoom.id,
        roomName: targetRoom.name,
        roomCategory: targetRoom.category,
        checkInDate: proposedCheckIn,
        checkOutDate: proposedCheckOut,
        totalAmount: Number(proposedPrice),
        reason: proposalReason.trim(),
        proposedAt: new Date().toISOString(),
        status: 'pending'
      };

      await proposeBookingChanges(selectedBooking.id, adminEmail, proposal);
      setActionFeedback({
        type: 'success',
        text: `Proposed change dispatched to ${selectedBooking.guestName}. Awaiting customer response.`
      });
      setShowProposeModal(false);
      onRefresh();
      setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to submit proposal' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async (b: Booking) => {
    setIsProcessing(true);
    try {
      await verifyBookingPayment(b.id, adminEmail);
      setActionFeedback({ type: 'success', text: `Payment for ${b.bookingReference} marked verified.` });
      onRefresh();
      if (selectedBooking?.id === b.id) setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to verify payment' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckIn = async (b: Booking) => {
    setIsProcessing(true);
    try {
      await checkInGuest(b.id, adminEmail);
      setActionFeedback({ type: 'success', text: `Guest ${b.guestName} successfully checked in!` });
      onRefresh();
      if (selectedBooking?.id === b.id) setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to check in guest' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async (b: Booking) => {
    setIsProcessing(true);
    try {
      await checkOutGuest(b.id, adminEmail);
      setActionFeedback({
        type: 'success',
        text: `Check-out finalized for ${b.guestName}. Housekeeping turnover task automatically dispatched.`
      });
      onRefresh();
      if (selectedBooking?.id === b.id) setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to check out guest' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveCancellation = async (b: Booking, approved: boolean) => {
    setIsProcessing(true);
    try {
      await resolveCancellationRequest(b.id, adminEmail, approved);
      setActionFeedback({
        type: 'success',
        text: `Cancellation ${approved ? 'approved' : 'declined'} for ${b.bookingReference}.`
      });
      onRefresh();
      if (selectedBooking?.id === b.id) setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to process cancellation' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveInternalNote = async () => {
    if (!selectedBooking || !internalNoteText.trim()) return;
    setIsProcessing(true);
    try {
      await addBookingInternalNote(selectedBooking.id, adminEmail, internalNoteText.trim());
      setActionFeedback({ type: 'success', text: 'Internal note saved to booking record.' });
      setShowNoteModal(false);
      onRefresh();
      setSelectedBooking(null);
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to save note' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendCustomNotification = async () => {
    if (!selectedBooking || !customMessageText.trim()) return;
    setIsProcessing(true);
    try {
      await createNotification({
        recipientUid: selectedBooking.userId,
        type: 'admin_alert',
        title: customMessageTitle.trim() || 'Notice from Homestay Host',
        message: customMessageText.trim(),
        bookingId: selectedBooking.id,
        bookingReference: selectedBooking.bookingReference,
        isRead: false
      });
      setActionFeedback({ type: 'success', text: `Message dispatched to guest ${selectedBooking.guestName}.` });
      setShowMessageModal(false);
      setCustomMessageTitle('');
      setCustomMessageText('');
    } catch (e: any) {
      setActionFeedback({ type: 'error', text: e.message || 'Failed to send notification' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 15 Tabs Specification
  const TABS: { id: BookingControlTab; label: string; count: number; color?: string }[] = [
    { id: 'new_requests', label: '1. New Requests', count: getTabCount('new_requests'), color: 'text-amber-800' },
    { id: 'awaiting_approval', label: '2. Awaiting Approval', count: getTabCount('awaiting_approval'), color: 'text-orange-800' },
    { id: 'awaiting_customer', label: '3. Awaiting Customer', count: getTabCount('awaiting_customer'), color: 'text-purple-800' },
    { id: 'confirmed', label: '4. Confirmed', count: getTabCount('confirmed'), color: 'text-emerald-800' },
    { id: 'payment_pending', label: '5. Payment Pending', count: getTabCount('payment_pending'), color: 'text-amber-700' },
    { id: 'payment_verified', label: '6. Payment Verified', count: getTabCount('payment_verified'), color: 'text-emerald-700' },
    { id: 'checkin_today', label: '7. Check-in Due Today', count: getTabCount('checkin_today'), color: 'text-blue-800' },
    { id: 'checked_in', label: '8. Checked-in Guests', count: getTabCount('checked_in'), color: 'text-blue-700' },
    { id: 'checkout_today', label: '9. Check-out Due Today', count: getTabCount('checkout_today'), color: 'text-rose-800' },
    { id: 'checked_out', label: '10. Checked-out', count: getTabCount('checked_out'), color: 'text-stone-700' },
    { id: 'cancellation_requests', label: '11. Cancellation Requests', count: getTabCount('cancellation_requests'), color: 'text-red-700' },
    { id: 'cancelled', label: '12. Cancelled', count: getTabCount('cancelled'), color: 'text-stone-500' },
    { id: 'rejected', label: '13. Rejected', count: getTabCount('rejected'), color: 'text-stone-500' },
    { id: 'refund_pending', label: '14. Refund Pending', count: getTabCount('refund_pending'), color: 'text-amber-900' },
    { id: 'completed', label: '15. Completed Stays', count: getTabCount('completed'), color: 'text-stone-600' }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-xs">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
              Admin Booking Control Center
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              Real-Time Control
            </span>
          </div>
          <p className="text-stone-500 text-xs mt-0.5">
            Strict lifecycle management, mutual approval workflows, double-booking prevention, and audit history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reference, guest, phone..."
              className="pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs w-48 sm:w-64 focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg cursor-pointer transition-colors"
            title="Refresh bookings from Firestore"
          >
            Refresh
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          <span>{actionFeedback.text}</span>
          <button onClick={() => setActionFeedback(null)} className="cursor-pointer text-stone-400 hover:text-stone-700">✕</button>
        </div>
      )}

      {/* 15 Separate Tabs Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-2 shadow-xs overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-800 text-white shadow-xs font-bold'
                    : 'bg-stone-50/70 hover:bg-stone-100 text-stone-600'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : tab.count > 0 ? 'bg-amber-100 text-amber-900 font-bold' : 'bg-stone-200 text-stone-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">Booking Ref & Time</th>
                <th className="py-3 px-4">Guest Details (Staff-Only)</th>
                <th className="py-3 px-4">Room & Category</th>
                <th className="py-3 px-4">Stay Dates</th>
                <th className="py-3 px-4">Amount & Payment</th>
                <th className="py-3 px-4">Status & Arrival</th>
                <th className="py-3 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400">
                    No bookings found in this tab.
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => (
                  <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Booking ID & Time */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-amber-950 block">{b.bookingReference}</span>
                      <span className="text-[10px] text-stone-400">
                        Created: {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {b.proposedChanges && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 font-bold text-[9px]">
                          Proposed Change: {b.proposedChanges.status.toUpperCase()}
                        </span>
                      )}
                    </td>

                    {/* Guest Contact */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 block">{b.guestName}</span>
                      <div className="flex items-center gap-1.5 text-stone-500 text-[11px] mt-0.5">
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{b.guestPhone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-stone-400 text-[10px]">
                        <Mail className="w-3 h-3 text-stone-300" />
                        <span className="truncate max-w-[140px]">{b.guestEmail}</span>
                      </div>
                    </td>

                    {/* Room */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-800 block">{b.roomName}</span>
                      <span className="text-[11px] text-stone-500">{b.roomCategory}</span>
                      {b.customerRequests && (
                        <span className="block text-[10px] text-amber-800 italic mt-0.5 truncate max-w-[150px]" title={b.customerRequests}>
                          Req: "{b.customerRequests}"
                        </span>
                      )}
                    </td>

                    {/* Stay Dates */}
                    <td className="py-3 px-4">
                      <div className="font-medium text-stone-900">
                        {b.checkInDate} → {b.checkOutDate}
                      </div>
                      <span className="text-[10px] text-stone-500">
                        {b.nights} Night(s) · {b.adults} Adults {b.children > 0 ? `· ${b.children} Child` : ''}
                      </span>
                    </td>

                    {/* Total & Payment */}
                    <td className="py-3 px-4">
                      <span className="font-bold text-stone-900 text-sm">₹{b.totalAmount}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                          b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.paymentStatus.replace(/_/g, ' ')}
                        </span>
                        {b.paymentVerified && (
                          <span className="text-[10px] text-emerald-700 font-bold">✓ Verified</span>
                        )}
                      </div>
                    </td>

                    {/* Status & Arrival Indicator */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block ${
                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        b.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                        b.status === 'checked_out' ? 'bg-stone-200 text-stone-700' :
                        b.status === 'awaiting_customer_confirmation' ? 'bg-purple-100 text-purple-800' :
                        b.status === 'cancellation_requested' ? 'bg-orange-100 text-orange-800' :
                        b.status === 'cancelled' || b.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-900'
                      }`}>
                        {b.status.replace(/_/g, ' ')}
                      </span>

                      {/* Guest Arrival Status Badge */}
                      {b.arrivalStatus === 'arrived' && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          <span>🔔 Guest Arrived at Property</span>
                        </div>
                      )}
                      {b.arrivalStatus === 'assistance_requested' && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          <span>⚠️ Check-In Help Requested</span>
                        </div>
                      )}
                      {b.checkoutRequested && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          <span>📤 Checkout Requested</span>
                        </div>
                      )}
                    </td>

                    {/* Workflow Action Buttons */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded text-[11px] cursor-pointer"
                        >
                          View Details
                        </button>

                        {/* Approve Booking */}
                        {(b.status === 'pending' || b.status === 'pending_approval') && (
                          <button
                            onClick={() => handleApprove(b)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs"
                          >
                            Approve
                          </button>
                        )}

                        {/* Propose Change */}
                        {(b.status === 'pending' || b.status === 'pending_approval' || b.status === 'confirmed') && (
                          <button
                            onClick={() => handleOpenPropose(b)}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold rounded text-[11px] cursor-pointer"
                          >
                            Propose Change
                          </button>
                        )}

                        {/* Check-In */}
                        {b.status === 'confirmed' && (
                          <button
                            onClick={() => handleCheckIn(b)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs"
                          >
                            Check-In
                          </button>
                        )}

                        {/* Check-Out */}
                        {b.status === 'checked_in' && (
                          <button
                            onClick={() => handleCheckOut(b)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded text-[11px] cursor-pointer shadow-xs"
                          >
                            Check-Out
                          </button>
                        )}

                        {/* Cancellation Request Actions */}
                        {b.status === 'cancellation_requested' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleResolveCancellation(b, true)}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-[10px] cursor-pointer"
                            >
                              Approve Cancel
                            </button>
                            <button
                              onClick={() => handleResolveCancellation(b, false)}
                              className="px-2 py-1 bg-stone-300 hover:bg-stone-400 text-stone-800 font-bold rounded text-[10px] cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {/* Payment Verification */}
                        {b.paymentStatus !== 'paid' && !b.paymentVerified && (
                          <button
                            onClick={() => handleVerifyPayment(b)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded text-[10px] cursor-pointer"
                            title="Verify bank/UPI payment"
                          >
                            Verify Pay
                          </button>
                        )}

                        {/* Reject */}
                        {(b.status === 'pending' || b.status === 'pending_approval') && (
                          <button
                            onClick={() => handleOpenReject(b)}
                            className="px-2 py-1 text-red-700 hover:bg-red-50 font-bold rounded text-[11px] cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED BOOKING CONTROL MODAL */}
      {selectedBooking && !showRejectModal && !showProposeModal && !showNoteModal && !showMessageModal && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl border text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-stone-900 text-base">Reservation Control File</h4>
                  <span className="font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">
                    {selectedBooking.bookingReference}
                  </span>
                </div>
                <p className="text-stone-500 text-[11px]">
                  ID: {selectedBooking.id} · Created {new Date(selectedBooking.createdAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guest & Contact Box */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
              <span className="font-bold text-stone-900 text-xs block">Guest Contact & Identity (Staff Confidential)</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-stone-700">
                <div>
                  <span className="block text-[10px] text-stone-400 uppercase font-bold">Name</span>
                  <span className="font-semibold text-stone-900">{selectedBooking.guestName}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-400 uppercase font-bold">Phone</span>
                  <span className="font-semibold text-stone-900">{selectedBooking.guestPhone}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-stone-400 uppercase font-bold">Email</span>
                  <span className="font-semibold text-stone-900 truncate block">{selectedBooking.guestEmail}</span>
                </div>
              </div>
            </div>

            {/* Room & Dates */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-bold">Room</span>
                <span className="font-semibold text-stone-900">{selectedBooking.roomName}</span>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-bold">Dates</span>
                <span className="font-semibold text-stone-900">{selectedBooking.checkInDate} to {selectedBooking.checkOutDate}</span>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-bold">Duration</span>
                <span className="font-semibold text-stone-900">{selectedBooking.nights} Night(s) · {selectedBooking.adults} Adults</span>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 uppercase font-bold">Total Amount</span>
                <span className="font-bold text-amber-900 text-sm">₹{selectedBooking.totalAmount}</span>
              </div>
            </div>

            {/* Special Requests & Arrival Details */}
            {(selectedBooking.specialRequests || selectedBooking.customerRequests || selectedBooking.arrivalNote) && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-950 space-y-1">
                <span className="font-bold text-[11px] block">Customer Special Requests & Arrival Notes:</span>
                <p className="text-stone-700">
                  {selectedBooking.customerRequests || selectedBooking.specialRequests || selectedBooking.arrivalNote}
                </p>
              </div>
            )}

            {/* Internal Staff Notes */}
            {selectedBooking.internalNotes && (
              <div className="p-3 bg-stone-100 rounded-xl border border-stone-300 space-y-1">
                <span className="font-bold text-[11px] text-stone-800 block">Internal Staff Notes:</span>
                <p className="text-stone-700">{selectedBooking.internalNotes}</p>
              </div>
            )}

            {/* Proposed Change Alert */}
            {selectedBooking.proposedChanges && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900">Active Change Proposal</span>
                  <span className="text-[10px] uppercase font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                    Status: {selectedBooking.proposedChanges.status}
                  </span>
                </div>
                <div className="text-purple-800 text-[11px]">
                  Proposed Room: <strong>{selectedBooking.proposedChanges.roomName}</strong> ({selectedBooking.proposedChanges.checkInDate} to {selectedBooking.proposedChanges.checkOutDate}) for ₹{selectedBooking.proposedChanges.totalAmount}.
                </div>
                <p className="text-stone-600 text-[10px]">Reason: {selectedBooking.proposedChanges.reason}</p>
              </div>
            )}

            {/* Booking History Timeline */}
            <div className="space-y-2 border-t pt-3">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-stone-500" />
                <span>Auditable Booking Activity Timeline</span>
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1.5 border rounded-xl p-3 bg-stone-50">
                {(!selectedBooking.bookingHistory || selectedBooking.bookingHistory.length === 0) ? (
                  <div className="text-stone-400 text-center py-2">No past timeline events. Booking created.</div>
                ) : (
                  selectedBooking.bookingHistory.map(h => (
                    <div key={h.id} className="text-[11px] p-2 bg-white rounded-lg border border-stone-200 flex justify-between items-start">
                      <div>
                        <span className="font-bold text-stone-900 block">{h.action}</span>
                        {h.note && <span className="text-stone-600 text-[10px] block">{h.note}</span>}
                      </div>
                      <div className="text-right text-[10px] text-stone-400 shrink-0">
                        <span>{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="block">{h.performedBy}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowNoteModal(true)}
                  className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-lg cursor-pointer"
                >
                  + Add Staff Note
                </button>
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-lg cursor-pointer"
                >
                  Send In-App Alert
                </button>
              </div>

              <div className="flex gap-1.5">
                {selectedBooking.status === 'confirmed' && (
                  <button
                    onClick={() => handleCheckIn(selectedBooking)}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Check In Guest
                  </button>
                )}
                {selectedBooking.status === 'checked_in' && (
                  <button
                    onClick={() => handleCheckOut(selectedBooking)}
                    className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Check Out & Turnover
                  </button>
                )}
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="px-3 py-1.5 bg-stone-800 text-white font-bold rounded-lg cursor-pointer"
                >
                  Close File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROPOSE ROOM/DATE CHANGE MODAL */}
      {showProposeModal && selectedBooking && (
        <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border shadow-2xl text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-extrabold text-stone-900 text-sm">Propose Alternative Dates / Room</h4>
              <button onClick={() => setShowProposeModal(false)} className="text-stone-400">✕</button>
            </div>
            <p className="text-stone-600">
              Propose changes for reservation <strong>{selectedBooking.bookingReference}</strong> ({selectedBooking.guestName}). The customer must explicitly accept before the change is finalized.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Select Proposed Room</label>
                <select
                  value={proposedRoomId}
                  onChange={e => {
                    setProposedRoomId(e.target.value);
                    const rm = rooms.find(r => r.id === e.target.value);
                    if (rm) setProposedPrice(rm.specialPrice || rm.basePrice);
                  }}
                  className="w-full border rounded-lg p-2 bg-white"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} - {r.name} (₹{r.specialPrice || r.basePrice}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Check-In</label>
                  <input
                    type="date"
                    value={proposedCheckIn}
                    onChange={e => setProposedCheckIn(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Check-Out</label>
                  <input
                    type="date"
                    value={proposedCheckOut}
                    onChange={e => setProposedCheckOut(e.target.value)}
                    className="w-full border rounded-lg p-2 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Proposed Total Price (₹)</label>
                <input
                  type="number"
                  value={proposedPrice}
                  onChange={e => setProposedPrice(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Reason for Proposal *</label>
                <textarea
                  value={proposalReason}
                  onChange={e => setProposalReason(e.target.value)}
                  placeholder="e.g. Upgrading you to 3rd-floor sunlit balcony room due to scheduled ground-floor painting..."
                  rows={3}
                  className="w-full border rounded-lg p-2 bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={() => setShowProposeModal(false)}
                className="px-3 py-1.5 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPropose}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg cursor-pointer"
              >
                Send Proposal to Guest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && selectedBooking && (
        <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border shadow-2xl text-xs">
            <h4 className="font-extrabold text-stone-900 text-sm">Reject Booking Request</h4>
            <p className="text-stone-600">
              Provide a clear reason for declining reservation <strong>{selectedBooking.bookingReference}</strong>:
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Room under emergency maintenance, capacity constraints..."
              rows={3}
              className="w-full border rounded-lg p-2 bg-white"
              required
            />
            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowRejectModal(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-lg cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERNAL NOTE MODAL */}
      {showNoteModal && selectedBooking && (
        <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border shadow-2xl text-xs">
            <h4 className="font-extrabold text-stone-900 text-sm">Add Staff Internal Note</h4>
            <p className="text-stone-500">Visible only to authorized staff and recorded in audit logs.</p>
            <textarea
              value={internalNoteText}
              onChange={e => setInternalNoteText(e.target.value)}
              placeholder="e.g. Guest requested extra blanket upon arrival, vegetarian breakfast requested..."
              rows={3}
              className="w-full border rounded-lg p-2 bg-white"
              required
            />
            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowNoteModal(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button
                onClick={handleSaveInternalNote}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-lg cursor-pointer"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM IN-APP MESSAGE MODAL */}
      {showMessageModal && selectedBooking && (
        <div className="fixed inset-0 z-70 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border shadow-2xl text-xs">
            <h4 className="font-extrabold text-stone-900 text-sm">Send Notification to Guest</h4>
            <p className="text-stone-500">Delivered directly to {selectedBooking.guestName}'s guest portal.</p>
            <div>
              <label className="block text-stone-700 font-bold mb-1">Title</label>
              <input
                type="text"
                value={customMessageTitle}
                onChange={e => setCustomMessageTitle(e.target.value)}
                placeholder="e.g. Check-In Welcome / Directions Update"
                className="w-full border rounded-lg p-2 bg-white"
              />
            </div>
            <div>
              <label className="block text-stone-700 font-bold mb-1">Message *</label>
              <textarea
                value={customMessageText}
                onChange={e => setCustomMessageText(e.target.value)}
                placeholder="Write your message to the guest..."
                rows={3}
                className="w-full border rounded-lg p-2 bg-white"
                required
              />
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button onClick={() => setShowMessageModal(false)} className="px-3 py-1.5 border rounded-lg">Cancel</button>
              <button
                onClick={handleSendCustomNotification}
                disabled={isProcessing}
                className="px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg cursor-pointer"
              >
                Dispatch Notification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
