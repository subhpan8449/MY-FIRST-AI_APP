import React, { useState, useEffect } from 'react';
import { useAuth, PRIMARY_OWNER_EMAIL } from '../context/AuthContext';
import {
  Shield,
  Lock,
  AlertCircle,
  X,
  CheckCircle2,
  ChevronDown,
  RefreshCw,
  ArrowRight,
  UserCheck
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser, userProfile, isAdmin, loginWithEmail, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const session = await loginWithEmail(email.trim(), password);
      if (session.isAdmin) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(
          `Signed in as ${session.user.email}, which is a Guest account and not in the authorized administrator list.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSubmit = async () => {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const session = await loginWithGoogle();
      if (!session) {
        // User calmly closed popup without choosing an account
        return;
      }
      if (session.isAdmin) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(
          `Signed in as Customer (${session.user.email}). Admin Corner requires an authorized Owner/Admin Google account (${PRIMARY_OWNER_EMAIL} or @devashish.in). Click "Continue with Google" again to pick the Owner account.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google administrator sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-300 animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 px-6 py-5 text-white flex items-center justify-between border-b border-amber-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-800/90 rounded-2xl border border-amber-500/30 shadow-xs">
              <Shield className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Administrator Google Portal</h3>
              <p className="text-[11px] text-amber-300/85">Devashish Sunlit Homestay · Tapovan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-stone-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close admin login"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Admin Security Policy Notice */}
          <div className="p-3.5 bg-amber-50/85 rounded-2xl border border-amber-200 text-stone-700 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <Lock className="w-4 h-4 text-amber-800" />
              <span>Restricted Owner &amp; Partner Access</span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              Verified via Google OAuth for <strong>Subhashish Pandey</strong> ({PRIMARY_OWNER_EMAIL}) and authorized <strong>@devashish.in</strong> co-partners. Customer Gmail accounts remain isolated with guest-only permissions.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="text-xs leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Already Logged In State (Admin vs Customer) */}
          {currentUser && isAdmin ? (
            <div className="space-y-3 py-1">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={userProfile?.fullName || 'Owner'}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0">
                    {(userProfile?.fullName || 'A')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1 text-emerald-800 font-extrabold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Google Admin Active</span>
                  </div>
                  <p className="font-bold text-stone-900 truncate">
                    {userProfile?.fullName || currentUser.displayName || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-stone-600 truncate">{currentUser.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-extrabold rounded-2xl shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Open 25-Module Master Admin Corner</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch Google Account</span>
              </button>
            </div>
          ) : (
            <>
              {currentUser && !isAdmin && (
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 flex items-center gap-2.5 text-stone-700">
                  <UserCheck className="w-4 h-4 text-stone-500 shrink-0" />
                  <span className="text-[11px] leading-snug">
                    Currently signed in as Customer: <strong>{currentUser.email}</strong>. Select your Admin Google account below to elevate access.
                  </span>
                </div>
              )}

              {/* Primary Google Admin Sign-in */}
              <button
                type="button"
                onClick={handleGoogleSubmit}
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-950 text-white font-extrabold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-60"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {isLoading
                    ? 'Verifying Google Admin...'
                    : 'Sign in with Google (Owner / Admin)'}
                </span>
              </button>

              {/* Collapsible Secondary Email/Password */}
              <div className="pt-1 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowEmailForm((prev) => !prev)}
                  className="w-full py-1.5 text-[11px] font-semibold text-stone-500 hover:text-amber-900 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{showEmailForm ? 'Hide email & password sign-in' : 'Or authorize via Email & Password'}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${showEmailForm ? 'rotate-180' : ''}`}
                  />
                </button>

                {showEmailForm && (
                  <form onSubmit={handleEmailSubmit} className="mt-3 space-y-3 animate-slideDown">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Administrator Email *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={PRIMARY_OWNER_EMAIL}
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 disabled:bg-stone-300 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {isLoading ? 'Verifying Admin Rights...' : 'Authorize & Enter Admin Corner'}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
