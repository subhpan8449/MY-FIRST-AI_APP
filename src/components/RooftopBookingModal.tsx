import React, { useState } from 'react';
import { RooftopPackage } from '../types';
import { useAuth } from '../context/AuthContext';
import { createRooftopBooking } from '../services/db';
import { X, CheckCircle2, AlertCircle, Eye, Calendar, Clock, Users, ArrowLeft } from 'lucide-react';

interface RooftopBookingModalProps {
  isOpen: boolean;
  pkg: RooftopPackage;
  onClose: () => void;
}

export const RooftopBookingModal: React.FC<RooftopBookingModalProps> = ({
  isOpen,
  pkg,
  onClose,
}) => {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState(pkg.availableSlots[0] || '6:00 PM – 9:00 PM');
  const [customerName, setCustomerName] = useState(userProfile?.fullName || '');
  const [customerPhone, setCustomerPhone] = useState(userProfile?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(userProfile?.email || '');
  const [guestsCount, setGuestsCount] = useState(pkg.capacity);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedId, setConfirmedId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('Please sign in with Google or Email to submit your reservation request.');
      return;
    }

    if (!customerName || !customerPhone || !customerEmail) {
      setErrorMessage('Please fill in your contact information.');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = await createRooftopBooking({
        packageId: pkg.id,
        packageName: pkg.name,
        userId: currentUser.uid,
        customerName,
        customerPhone,
        customerEmail,
        date,
        timeSlot,
        guestsCount,
        specialRequests,
        totalAmount: pkg.price,
      });

      setConfirmedId(id);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit rooftop booking request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200">
        <div className="bg-amber-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Return to Packages"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div>
              <h3 className="text-base font-bold">{pkg.name}</h3>
              <p className="text-xs text-amber-200">₹{pkg.price} · {pkg.durationHours} Hours Experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedId ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-stone-900">Request Submitted!</h4>
            <p className="text-xs text-stone-600">
              Host Subhashish Pandey will review your request for{' '}
              <span className="font-semibold">{pkg.name}</span> on{' '}
              <span className="font-semibold">{date} ({timeSlot})</span>.
            </p>
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-stone-700 border border-amber-200">
              Payment of ₹{pkg.price} will be settled at the property upon confirmation.
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!currentUser && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
                <span className="text-xs text-amber-900">Sign in to save this booking</span>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-stone-300 rounded hover:bg-stone-50 cursor-pointer"
                >
                  Continue with Google
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Time Slot</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  {pkg.availableSlots.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="name@email.com"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Special Decoration or Occasion Note
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="e.g. Anniversary message on table, dietary preferences, floral colors..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex justify-between items-center text-xs">
              <span className="text-stone-600">Total Package Amount</span>
              <span className="text-base font-bold text-amber-950 tabular-nums">₹{pkg.price}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg shadow-sm cursor-pointer"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Package Booking Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
