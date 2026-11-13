import React, { useState, useEffect } from 'react';
import { CustomerServiceRequest, CustomerServiceCategory, ServicePriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { createServiceRequest, getUserServiceRequests, rateServiceRequest } from '../services/db';
import {
  X,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Plus,
  Send,
  Droplet,
  Wifi,
  Wrench,
  Utensils,
  HelpCircle,
  Layers,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';

interface CustomerServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRoomNumber?: string;
  defaultBookingReference?: string;
}

const SERVICE_OPTIONS: Record<CustomerServiceCategory, { label: string; icon: any; items: string[] }> = {
  room_service: {
    label: 'Room & Linens',
    icon: Sparkles,
    items: [
      'Room Cleaning',
      'Bathroom Cleaning',
      'Fresh Bedsheets',
      'Fresh Towels',
      'Extra Pillows',
      'Extra Blanket',
      'Extra Bedding Set',
      'Room Maintenance Check',
      'Electrical Issue',
      'Plumbing / Hot Water Issue',
      'Wi-Fi Connection Check'
    ]
  },
  guest_convenience: {
    label: 'Guest Convenience',
    icon: Droplet,
    items: [
      'RO Drinking Water Bottle',
      'Toiletries Kit',
      'Luggage Assistance',
      'Wake-up Call Request',
      'Local Rishikesh Transit Info',
      'Special Room Preparation',
      'Late Checkout Request',
      'Early Check-in Request'
    ]
  },
  food_service: {
    label: 'Food & CookNow',
    icon: Utensils,
    items: [
      'CookNow Food Ordering Assistance',
      'Order Status Follow-up',
      'Dietary Water & Tea Request',
      'Breakfast Timing Inquiry'
    ]
  },
  other: {
    label: 'Other & Facilities',
    icon: HelpCircle,
    items: [
      'Swimming Pool Assistance',
      'Kids Play Area Inquiries',
      'Rooftop Terrace Reservation Inquiry',
      'Special Occasion Decoration Request',
      'General Reception Help'
    ]
  }
};

export const CustomerServiceModal: React.FC<CustomerServiceModalProps> = ({
  isOpen,
  onClose,
  defaultRoomNumber = '',
  defaultBookingReference = '',
}) => {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'request' | 'my-requests'>('request');
  const [requests, setRequests] = useState<CustomerServiceRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Form state
  const [category, setCategory] = useState<CustomerServiceCategory>('room_service');
  const [serviceType, setServiceType] = useState<string>(SERVICE_OPTIONS.room_service.items[0]);
  const [roomNumber, setRoomNumber] = useState<string>(defaultRoomNumber);
  const [bookingReference, setBookingReference] = useState<string>(defaultBookingReference);
  const [guestName, setGuestName] = useState<string>(userProfile?.fullName || '');
  const [guestPhone, setGuestPhone] = useState<string>(userProfile?.phone || '');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<ServicePriority>('medium');
  const [preferredTime, setPreferredTime] = useState<string>('As soon as possible');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rating modal state
  const [ratingTargetId, setRatingTargetId] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');

  const loadRequests = async () => {
    if (!currentUser) return;
    setIsLoadingRequests(true);
    try {
      const list = await getUserServiceRequests(currentUser.uid);
      setRequests(list);
    } catch (err: any) {
      console.error('Error fetching service requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUser) {
      loadRequests();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (userProfile) {
      if (!guestName) setGuestName(userProfile.fullName);
      if (!guestPhone && userProfile.phone) setGuestPhone(userProfile.phone);
    }
  }, [userProfile]);

  if (!isOpen) return null;

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!currentUser) {
      setStatusMessage({ type: 'error', text: 'Please sign in to submit service requests.' });
      return;
    }

    if (!roomNumber.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your room number.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createServiceRequest({
        bookingReference: bookingReference.trim(),
        roomNumber: roomNumber.trim(),
        userId: currentUser.uid,
        guestName: guestName || 'Staying Guest',
        guestPhone: guestPhone || '',
        category,
        serviceType,
        description: description.trim(),
        priority,
        preferredTime,
      });

      setStatusMessage({ type: 'success', text: 'Your service request has been logged and assigned to staff.' });
      setDescription('');
      setActiveTab('my-requests');
      loadRequests();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit service request.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRateService = async (id: string) => {
    try {
      await rateServiceRequest(id, selectedRating, reviewComment);
      setRatingTargetId(null);
      setReviewComment('');
      loadRequests();
    } catch (err: any) {
      console.error('Failed to rate service:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200">
        {/* Header with Back button */}
        <div className="bg-amber-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Return to Homestay"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Homestay</span>
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-200/80">
                <span>Home &gt; Guest Services</span>
              </div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Customer Service Portal</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 px-6 bg-stone-50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('request')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'request'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            New Service Request
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`py-3 px-4 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'my-requests'
                ? 'border-amber-700 text-amber-900 bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            Track My Requests ({requests.length})
          </button>
        </div>

        {/* Feedback Alert */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-red-50 text-red-800 border-b border-red-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="font-bold hover:underline cursor-pointer">
              ✕
            </button>
          </div>
        )}

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {activeTab === 'request' ? (
            /* NEW SERVICE REQUEST FORM */
            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              {/* Category Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Service Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(SERVICE_OPTIONS) as CustomerServiceCategory[]).map((catKey) => {
                    const option = SERVICE_OPTIONS[catKey];
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => {
                          setCategory(catKey);
                          setServiceType(SERVICE_OPTIONS[catKey].items[0]);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          category === catKey
                            ? 'bg-amber-50/80 border-amber-600 text-amber-950 font-bold shadow-xs'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${category === catKey ? 'text-amber-700' : 'text-stone-400'}`} />
                        <span className="text-[11px] text-center">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service Type Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Required Service</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  {SERVICE_OPTIONS[category].items.map((item, idx) => (
                    <option key={idx} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room & Booking Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Room Number *</label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 201"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Booking Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    placeholder="e.g. DSH-20261030-1042"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              </div>

              {/* Priority & Preferred Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ServicePriority)}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    <option value="low">Low (Whenever convenient)</option>
                    <option value="medium">Medium (Within 1-2 hours)</option>
                    <option value="high">High (Prompt attention needed)</option>
                    <option value="urgent">Urgent (Immediate assistance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Preferred Time</label>
                  <input
                    type="text"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    placeholder="e.g. As soon as possible / 4:00 PM"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Additional Details / Notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Please bring 2 extra bath towels and replenish drinking water jar..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Dispatching to Homestay Staff...' : 'Submit Request to Staff'}</span>
              </button>
            </form>
          ) : (
            /* MY REQUESTS TRACKING LIST */
            <div className="space-y-3">
              {isLoadingRequests ? (
                <div className="text-center py-10 text-xs text-stone-500">Loading your service requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Sparkles className="w-10 h-10 text-stone-300 mx-auto" />
                  <h4 className="text-sm font-bold text-stone-700">No Service Requests</h4>
                  <p className="text-xs text-stone-500">
                    Need fresh towels, extra pillows, or drinking water? Switch to the "New Service Request" tab.
                  </p>
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <div>
                        <span className="font-bold text-stone-900 text-sm">{req.serviceType}</span>
                        <span className="text-[11px] text-stone-500 ml-2">Room {req.roomNumber}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          req.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : req.status === 'assigned'
                            ? 'bg-purple-100 text-purple-800'
                            : req.status === 'submitted'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>

                    {req.description && (
                      <p className="text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                        {req.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-stone-500 gap-2">
                      <span>Submitted: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {req.assignedStaffName && (
                        <span className="font-medium text-stone-700">Assigned to: {req.assignedStaffName}</span>
                      )}
                    </div>

                    {/* Rating affordance for completed services */}
                    {req.status === 'completed' && !req.rating && (
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[11px] text-stone-500">Service completed. How was the quality?</span>
                        <button
                          onClick={() => setRatingTargetId(req.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 rounded cursor-pointer"
                        >
                          Rate Service
                        </button>
                      </div>
                    )}

                    {req.rating && (
                      <div className="pt-2 border-t border-stone-100 flex items-center gap-1 text-[11px] text-amber-800">
                        <span className="font-semibold">Rated:</span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= req.rating! ? 'fill-amber-500 text-amber-500' : 'text-stone-300'
                              }`}
                            />
                          ))}
                        </div>
                        {req.reviewComment && <span className="text-stone-600 italic ml-1">"{req.reviewComment}"</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rating Modal Dialog */}
        {ratingTargetId && (
          <div className="p-4 bg-amber-50 border-t border-amber-200 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950">Rate Completed Service</span>
              <button onClick={() => setRatingTargetId(null)} className="text-stone-500 hover:text-stone-800">
                ✕
              </button>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedRating(s)}
                  className="p-1 cursor-pointer"
                >
                  <Star
                    className={`w-5 h-5 ${
                      s <= selectedRating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Optional comment: staff was fast, polite..."
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRatingTargetId(null)}
                className="px-3 py-1 text-xs text-stone-600 hover:bg-stone-100 rounded"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRateService(ratingTargetId)}
                className="px-3.5 py-1 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded"
              >
                Submit Rating
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
