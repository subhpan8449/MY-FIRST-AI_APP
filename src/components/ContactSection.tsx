import React, { useState } from 'react';
import { submitContactEnquiry } from '../services/db';
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !email || !message) {
      setErrorMsg('Please fill in your name, email, and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContactEnquiry({
        name,
        email,
        phone,
        message
      });
      setIsSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit enquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Homestay Information */}
          <div className="space-y-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded">
                Get in Touch
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-2">
                We're Here in Tapovan to Welcome You
              </h2>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                Whether you have questions about student rates, group family stays, parking, or check-in timing, our team is always ready to assist.
              </p>
            </div>

            <div className="space-y-4 text-xs text-stone-700">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-stone-900">Address & Location</strong>
                  <span>Devashish Sunlit Homestay, Tapovan, Rishikesh, Uttarakhand, India (Near Laxman Jhula bypass)</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-stone-900">Check-in / Check-out Times</strong>
                  <span>Standard Check-in: 12:00 PM · Check-out: 11:00 AM</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-stone-900">General Enquiries</strong>
                  <span>Reception assistance & booking queries handled through this secure form</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-stone-600">
              <strong className="text-stone-800">Affordable Hospitality Guarantee:</strong> We keep prices straightforward and accessible so that pilgrims, budget wanderers, and families enjoy an honest Himalayan experience.
            </div>
          </div>

          {/* Contact & Enquiry Form */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-4">Send Us a Message</h3>

            {isSuccess ? (
              <div className="p-6 text-center space-y-3 bg-white rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-stone-900">Enquiry Received!</h4>
                <p className="text-xs text-stone-600">
                  Thank you for reaching out. The Devashish Homestay host will review your note and respond via email or WhatsApp promptly.
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="mt-2 px-4 py-1.5 text-xs font-semibold text-amber-800 hover:underline cursor-pointer"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {errorMsg && (
                  <div className="p-2.5 bg-red-50 text-red-700 rounded text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Phone (Optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">How can we help?</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Questions about dates, room sizes, kids play sessions, or group packages..."
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-lg shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
