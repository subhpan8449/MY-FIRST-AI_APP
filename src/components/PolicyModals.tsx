import React from 'react';
import { X, Shield, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';

interface PolicyModalProps {
  type: 'privacy' | 'terms' | 'cancellation' | null;
  onClose: () => void;
}

export const PolicyModals: React.FC<PolicyModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200">
        <div className="bg-amber-900 px-6 py-4 text-white flex items-center justify-between">
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
              <FileText className="w-5 h-5 text-amber-300" />
              <h3 className="text-base font-bold capitalize">
                {type === 'privacy'
                  ? 'Privacy & Guest Data Protection Policy'
                  : type === 'terms'
                  ? 'Homestay Terms & House Guidelines'
                  : 'Cancellation & Refund Policy'}
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

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs text-stone-700 leading-relaxed">
          {type === 'privacy' && (
            <>
              <h4 className="text-sm font-bold text-stone-900">1. Information Collection & Storage</h4>
              <p>
                Devashish Sunlit Homestay collects only essential guest details (full name, verified email, contact telephone number, and government-issued ID upon arrival) strictly required for booking confirmation and local hospitality compliance in Uttarakhand, India.
              </p>

              <h4 className="text-sm font-bold text-stone-900">2. Children's Privacy</h4>
              <p>
                In our dedicated Children's Play Area reservation workflow, we collect only minimal, non-identifying operational details (child's first name, age) along with the responsible adult guardian's contact number. We strictly forbid selling or commercializing children's data.
              </p>

              <h4 className="text-sm font-bold text-stone-900">3. Administrator Contact Confidentiality</h4>
              <p>
                In strict compliance with our business policies, administrator and owner personal phone numbers and private addresses remain confidential by default and are not disclosed to external marketing third parties.
              </p>

              <h4 className="text-sm font-bold text-stone-900">4. Third-Party Integrations</h4>
              <p>
                External services like Google Authentication operate under secure OAuth2 tokens. We do not store plain-text passwords or financial payment secrets.
              </p>
            </>
          )}

          {type === 'terms' && (
            <>
              <h4 className="text-sm font-bold text-stone-900">1. Property Nature & Atmosphere</h4>
              <p>
                Devashish Sunlit Homestay is an affordable, clean, comfortable, and peaceful family homestay located in Tapovan, Rishikesh. We maintain a respectful, welcoming Himalayan environment for students, pilgrims, families, and travelers.
              </p>

              <h4 className="text-sm font-bold text-stone-900">2. Swimming Pool Guidelines</h4>
              <p>
                Swimming pool access is complimentary for all registered guests. Opening hours are 7:00 AM to 7:30 PM (maintenance closure 1:00 PM – 2:30 PM). There is no permanent lifeguard on duty; all minors under 14 must be accompanied by an adult guardian at all times.
              </p>

              <h4 className="text-sm font-bold text-stone-900">3. Kids Play Area Supervision</h4>
              <p>
                Parents and guardians remain exclusively responsible for their children's safety and supervision. The homestay provides safe equipment but does not operate professional childcare or daycare services.
              </p>

              <h4 className="text-sm font-bold text-stone-900">4. Quiet Hours & Neighborhood Respect</h4>
              <p>
                To preserve tranquility for all staying guests and local residents, quiet hours begin strictly at 9:30 PM. High-volume music and disruptive activities are not permitted on balconies or rooftop decks after this time.
              </p>
            </>
          )}

          {type === 'cancellation' && (
            <>
              <h4 className="text-sm font-bold text-stone-900">1. Free Cancellation Window</h4>
              <p>
                Guests can cancel their room reservation free of charge up to 48 hours prior to the official check-in time (12:00 PM on the arrival date).
              </p>

              <h4 className="text-sm font-bold text-stone-900">2. Late Cancellation Policy</h4>
              <p>
                Cancellations made within 48 hours of check-in or no-shows are subject to a nominal one-night room charge to offset holding inventory during high-demand Tapovan travel periods.
              </p>

              <h4 className="text-sm font-bold text-stone-900">3. Pay at Property Flexibility</h4>
              <p>
                Standard reservations operate under our "Pay upon Check-In" model, allowing guests to inspect their room on arrival before settling room dues in cash, UPI, or accepted card methods.
              </p>
            </>
          )}
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Homestay</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer"
          >
            I Understand &amp; Accept
          </button>
        </div>
      </div>
    </div>
  );
};
