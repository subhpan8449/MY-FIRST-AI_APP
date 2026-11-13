import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createPlayAreaBooking } from '../services/db';
import { X, CheckCircle2, AlertCircle, Baby, Clock, ArrowLeft } from 'lucide-react';

interface PlayAreaModalProps {
  isOpen: boolean;
  initialSession: 'morning' | 'afternoon' | 'evening';
  onClose: () => void;
}

export const PlayAreaModal: React.FC<PlayAreaModalProps> = ({
  isOpen,
  initialSession,
  onClose,
}) => {
  const { currentUser, userProfile, loginWithGoogle } = useAuth();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState<'morning' | 'afternoon' | 'evening'>(initialSession);
  const [timeSlot, setTimeSlot] = useState(
    initialSession === 'morning' ? '9:00 AM – 10:00 AM' : initialSession === 'afternoon' ? '4:00 PM – 5:00 PM' : '6:00 PM – 7:00 PM'
  );
  const [parentName, setParentName] = useState(userProfile?.fullName || '');
  const [parentPhone, setParentPhone] = useState(userProfile?.phone || '');
  const [roomNumber, setRoomNumber] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedRef, setConfirmedRef] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('Please sign in to reserve a play area session.');
      return;
    }

    if (!parentName || !parentPhone || !childName) {
      setErrorMessage('Please provide parent name, contact phone, and child name.');
      return;
    }

    if (childAge < 2 || childAge > 12) {
      setErrorMessage('Children play area is configured for ages 2 to 12 years.');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = await createPlayAreaBooking({
        userId: currentUser.uid,
        parentName,
        parentPhone,
        roomNumber: roomNumber.trim(),
        childName,
        childAge,
        date,
        session,
        timeSlot,
      });

      setConfirmedRef(`PLAY-${id.slice(0, 6).toUpperCase()}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit play area reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200">
        <div className="bg-amber-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Return to Homestay"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-amber-300" />
              <div>
                <h3 className="text-base font-bold">Reserve Play Area Slot</h3>
                <p className="text-xs text-amber-200">Included for Devashish Homestay guests</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmedRef ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-stone-900">Slot Confirmed!</h4>
            <p className="text-xs text-stone-600">
              We look forward to welcoming <span className="font-semibold">{childName}</span> on{' '}
              <span className="font-semibold">{date} ({timeSlot})</span>.
            </p>
            <div className="p-3 bg-amber-50 rounded-lg text-xs text-stone-700 border border-amber-200">
              Please ensure adult guardian supervision throughout the playtime.
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
                <span className="text-xs text-amber-900">Sign in to save this reservation</span>
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-stone-300 rounded hover:bg-stone-50 cursor-pointer"
                >
                  Sign In with Google
                </button>
              </div>
            )}

            {/* Date & Session */}
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
                <label className="block text-xs font-semibold text-stone-700 mb-1">Session</label>
                <select
                  value={session}
                  onChange={(e) => {
                    const s = e.target.value as 'morning' | 'afternoon' | 'evening';
                    setSession(s);
                    setTimeSlot(
                      s === 'morning' ? '9:00 AM – 10:00 AM' : s === 'afternoon' ? '4:00 PM – 5:00 PM' : '6:00 PM – 7:00 PM'
                    );
                  }}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="morning">Morning (8 AM - 12 PM)</option>
                  <option value="afternoon">Afternoon (3 PM - 6 PM)</option>
                  <option value="evening">Evening (6 PM - 8 PM)</option>
                </select>
              </div>
            </div>

            {/* Slot time */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Time Slot</label>
              <input
                type="text"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                placeholder="e.g. 9:00 AM – 10:00 AM"
                required
              />
            </div>

            {/* Parent Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Parent/Guardian</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Contact Mobile"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
            </div>

            {/* Child Info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-stone-700 mb-1">Child Name</label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Child's Name"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Age (2–12)</label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={childAge}
                  onChange={(e) => setChildAge(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                  required
                />
              </div>
            </div>

            {/* Room number */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Homestay Room Number (Optional if already checked in)
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. Room 203"
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'Submitting Reservation...' : 'Confirm Free Play Area Slot'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
