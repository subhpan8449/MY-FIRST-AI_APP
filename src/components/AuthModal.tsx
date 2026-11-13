import React, { useState, useEffect } from 'react';
import { useAuth, PRIMARY_OWNER_EMAIL } from '../context/AuthContext';
import {
  X,
  Lock,
  Mail,
  User,
  Phone,
  AlertCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  CalendarCheck,
  Award,
  Utensils,
  ChevronDown,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
  initialAccountType?: 'customer' | 'admin';
  onAdminSuccess?: () => void;
}

const GoogleMark: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
);

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialAccountType = 'customer',
  onAdminSuccess,
}) => {
  const {
    currentUser,
    userProfile,
    isAdmin,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
  } = useAuth();

  const [accountType, setAccountType] = useState<'customer' | 'admin'>(initialAccountType);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [nonAdminWarningEmail, setNonAdminWarningEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAccountType(initialAccountType);
      setMode(initialMode);
      setErrorMessage('');
      setSuccessMessage('');
      setNonAdminWarningEmail(null);
    }
  }, [isOpen, initialAccountType, initialMode]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setNonAdminWarningEmail(null);
    setIsSubmitting(true);
    try {
      const session = await loginWithGoogle();
      if (!session) {
        // User closed the Google popup calmly
        return;
      }
      if (accountType === 'admin') {
        if (session.isAdmin) {
          onClose();
          onAdminSuccess?.();
        } else {
          setNonAdminWarningEmail(session.user.email || 'this account');
          setErrorMessage(
            `Signed in with ${session.user.email}, which is a Customer account. Please select an authorized Owner/Admin Google account (${PRIMARY_OWNER_EMAIL} or @devashish.in) to unlock Admin Corner.`
          );
        }
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const session = await loginWithEmail(email.trim(), password);
        if (accountType === 'admin') {
          if (session.isAdmin) {
            onClose();
            onAdminSuccess?.();
          } else {
            setErrorMessage(
              `Signed in as ${session.user.email}, which is a Guest account without Administrator permissions.`
            );
          }
        } else {
          onClose();
        }
      } else if (mode === 'register') {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        await registerWithEmail(email.trim(), password, fullName.trim(), phone.trim());
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email.trim());
        setSuccessMessage('Password reset instructions have been sent to your email.');
      }
    } catch (err: any) {
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        setErrorMessage('Invalid email or password. Try "Continue with Google" for instant sign-in.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please sign in or use Continue with Google.');
      } else {
        setErrorMessage(err.message || 'Authentication error. Please try Continue with Google.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 animate-scaleIn">
        {/* Modal Header */}
        <div
          className={`px-6 py-5 text-white flex items-center justify-between transition-colors ${
            accountType === 'admin'
              ? 'bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900'
              : 'bg-gradient-to-r from-amber-800 via-amber-900 to-amber-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
              {accountType === 'admin' ? (
                <Shield className="w-5 h-5 text-amber-300" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                {accountType === 'admin'
                  ? 'Admin & Owner Google Access'
                  : mode === 'register'
                  ? 'Create Guest Account'
                  : 'Welcome to Sunlit Stay'}
              </h3>
              <p className="text-[11px] text-amber-200/90">
                Devashish Sunlit Homestay · Tapovan, Rishikesh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Close sign-in modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Dedicated Customer vs Admin Google Login Switcher */}
          <div className="p-1 bg-stone-100 rounded-2xl border border-stone-200 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setAccountType('customer');
                setErrorMessage('');
                setNonAdminWarningEmail(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                accountType === 'customer'
                  ? 'bg-white text-amber-950 shadow-sm border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-amber-700" />
              <span>Customer / Guest</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('admin');
                setMode('login');
                setErrorMessage('');
                setNonAdminWarningEmail(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                accountType === 'admin'
                  ? 'bg-amber-950 text-amber-100 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin / Owner</span>
            </button>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
              {nonAdminWarningEmail && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Switch Google Account</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 text-stone-800 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    Continue as Customer
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Already Logged In Banner */}
          {currentUser && accountType === 'admin' && isAdmin && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={userProfile?.fullName || 'Admin'}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center">
                    {(userProfile?.fullName || 'A')[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                    Verified Owner / Admin Session
                  </span>
                  <p className="text-xs font-bold text-stone-900 truncate">
                    {userProfile?.fullName || currentUser.displayName}
                  </p>
                  <p className="text-[11px] text-stone-600 truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAdminSuccess?.();
                }}
                className="w-full py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                <span>Open 25-Module Master Admin Corner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Role Benefits Summary */}
          {accountType === 'customer' ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
                <CalendarCheck className="w-4 h-4 text-amber-800 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-stone-800 block leading-tight">Live Bookings</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
                <Award className="w-4 h-4 text-amber-800 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-stone-800 block leading-tight">Play &amp; Earn Pts</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70">
                <Utensils className="w-4 h-4 text-amber-800 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-stone-800 block leading-tight">Room Dining</span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200 text-stone-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 text-xs">
                <Lock className="w-3.5 h-3.5 text-amber-800" />
                <span>Verified Google Admin Authentication</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                Sign in securely with the authorized owner Google account (<strong>{PRIMARY_OWNER_EMAIL}</strong>) or partner <strong>@devashish.in</strong> Google ID.
              </p>
            </div>
          )}

          {/* Primary 1-Click Google Authentication CTA */}
          {mode !== 'forgot' && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className={`w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 ${
                  accountType === 'admin'
                    ? 'bg-stone-900 hover:bg-stone-950 text-white border border-stone-800'
                    : 'bg-white hover:bg-stone-50 text-stone-900 border-2 border-stone-200 hover:border-amber-500'
                }`}
              >
                <GoogleMark className="w-5 h-5 shrink-0" />
                <span>
                  {isSubmitting
                    ? 'Connecting with Google...'
                    : accountType === 'admin'
                    ? 'Continue with Google (Admin / Owner)'
                    : currentUser
                    ? 'Switch Customer Google Account'
                    : 'Continue with Google (Customer)'}
                </span>
              </button>
              <p className="text-[10px] text-center text-stone-500">
                One-tap verified Firebase Google Sign-In · Choose any Gmail account
              </p>
            </div>
          )}

          {/* Secondary Collapsible Email / Password Auth */}
          <div className="pt-1 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowEmailForm((prev) => !prev)}
              className="w-full py-1.5 text-[11px] font-semibold text-stone-500 hover:text-amber-900 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{showEmailForm ? 'Hide email & password options' : 'Or sign in using Email & Password'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${showEmailForm ? 'rotate-180' : ''}`}
              />
            </button>

            {showEmailForm && (
              <div className="mt-3 space-y-3 animate-slideDown">
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {mode === 'register' && accountType === 'customer' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                        <div className="relative">
                          <User className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. Rahul Sharma"
                            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number (Optional)</label>
                        <div className="relative">
                          <Phone className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 9897335265"
                            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={accountType === 'admin' ? PRIMARY_OWNER_EMAIL : 'name@email.com'}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                        required
                      />
                    </div>
                  </div>

                  {mode !== 'forgot' && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-semibold text-stone-700">Password</label>
                        {mode === 'login' && (
                          <button
                            type="button"
                            onClick={() => setMode('forgot')}
                            className="text-[11px] text-amber-800 hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-600"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 disabled:bg-stone-300 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {isSubmitting
                      ? 'Processing...'
                      : mode === 'login'
                      ? 'Sign In with Email'
                      : mode === 'register'
                      ? 'Create Guest Account'
                      : 'Send Reset Link'}
                  </button>
                </form>

                {accountType === 'customer' && (
                  <div className="text-center text-xs text-stone-600">
                    {mode === 'login' ? (
                      <p>
                        New guest?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('register')}
                          className="font-semibold text-amber-800 hover:underline cursor-pointer"
                        >
                          Create email account
                        </button>
                      </p>
                    ) : (
                      <p>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('login')}
                          className="font-semibold text-amber-800 hover:underline cursor-pointer"
                        >
                          Back to sign in
                        </button>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
