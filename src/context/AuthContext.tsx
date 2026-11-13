import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

export interface AuthSessionResult {
  user: FirebaseUser;
  isAdmin: boolean;
  isPrimaryOwner: boolean;
  fullName: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isPrimaryOwner: boolean;
  isLoading: boolean;
  authNotice: { type: 'success' | 'info' | 'error'; message: string } | null;
  clearAuthNotice: () => void;
  loginWithGoogle: () => Promise<AuthSessionResult | null>;
  loginWithEmail: (email: string, pass: string) => Promise<AuthSessionResult>;
  registerWithEmail: (email: string, pass: string, fullName: string, phone?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Primary owner email from specification
export const PRIMARY_OWNER_EMAIL = 'subhpan8449@gmail.com';

const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower === PRIMARY_OWNER_EMAIL.toLowerCase() || lower.endsWith('@devashish.in');
};

const formatFirebaseAuthError = (error: any): string => {
  const code = error?.code || '';
  switch (code) {
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and click "Continue with Google" again.';
    case 'auth/cancelled-popup-request':
      return 'Another Google sign-in window is already open. Please complete or close it and try again.';
    case 'auth/network-request-failed':
      return 'Network interruption while connecting to Google. Please check your internet connection and retry.';
    case 'auth/unauthorized-domain':
      return 'This domain needs authorization in Firebase Console → Authentication → Settings → Authorized domains.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled. Please click "Continue with Google" for instant one-click access.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isPrimaryOwner, setIsPrimaryOwner] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authNotice, setAuthNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const clearAuthNotice = () => setAuthNotice(null);

  // Sync profile & check admin rights
  const fetchUserProfile = async (user: FirebaseUser): Promise<AuthSessionResult> => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      const isOwnerEmail = user.email?.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase();
      const isDomainAdmin = isAuthorizedAdminEmail(user.email);

      // Check adminRoles collection
      let hasAdminDoc = false;
      try {
        const adminRef = doc(db, 'adminRoles', user.uid);
        const adminSnap = await getDoc(adminRef);
        if (adminSnap.exists() && adminSnap.data()?.status === 'active') {
          hasAdminDoc = true;
        }
      } catch {
        // Ignored if permissions restrict or document does not exist yet
      }

      const adminAccess = isDomainAdmin || hasAdminDoc;
      setIsAdmin(adminAccess);
      setIsPrimaryOwner(isOwnerEmail);

      let resolvedName = user.displayName || 'Guest User';

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        const mergedProfile: UserProfile = {
          ...data,
          fullName: data.fullName || user.displayName || 'Guest User',
          photoURL: user.photoURL || data.photoURL || '',
          role: adminAccess ? 'admin' : (data.role || 'guest')
        };
        resolvedName = mergedProfile.fullName;
        setUserProfile(mergedProfile);

        // Keep Google photoURL & role cleanly synced in background
        if (
          (user.photoURL && user.photoURL !== data.photoURL) ||
          (adminAccess && data.role !== 'admin')
        ) {
          setDoc(
            userRef,
            {
              photoURL: user.photoURL || data.photoURL || '',
              role: adminAccess ? 'admin' : (data.role || 'guest')
            },
            { merge: true }
          ).catch(() => {});
        }
      } else {
        // Create initial profile
        const newProfile: UserProfile = {
          uid: user.uid,
          fullName: user.displayName || 'Guest User',
          email: user.email || '',
          phone: user.phoneNumber || '',
          photoURL: user.photoURL || '',
          role: adminAccess ? 'admin' : 'guest',
          createdAt: new Date().toISOString(),
        };

        await setDoc(userRef, {
          ...newProfile,
          serverCreated: serverTimestamp(),
        });
        resolvedName = newProfile.fullName;
        setUserProfile(newProfile);

        // If primary owner, initialize the adminRoles document
        if (isOwnerEmail) {
          try {
            const adminDocRef = doc(db, 'adminRoles', user.uid);
            await setDoc(adminDocRef, {
              email: PRIMARY_OWNER_EMAIL,
              name: user.displayName || 'Subhashish Pandey',
              designation: 'Owner',
              role: 'primary_owner',
              phone: '9897335265',
              isPublicVisible: false,
              status: 'active',
              createdAt: new Date().toISOString(),
            }, { merge: true });
          } catch (err) {
            console.warn('Could not auto-bootstrap adminRoles:', err);
          }
        }
      }

      return {
        user,
        isAdmin: adminAccess,
        isPrimaryOwner: isOwnerEmail,
        fullName: resolvedName
      };
    } catch (error) {
      console.error('Error fetching/creating user profile:', error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await fetchUserProfile(user);
        } catch (err) {
          console.warn('Profile sync notice:', err);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setIsPrimaryOwner(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<AuthSessionResult | null> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const session = await fetchUserProfile(result.user);
        setAuthNotice({
          type: 'success',
          message: session.isAdmin
            ? `Welcome back, ${session.fullName}! Signed in via Google with Admin & Owner access.`
            : `Welcome, ${session.fullName}! Signed in with Google as a Verified Guest.`
        });
        return session;
      }
      return null;
    } catch (error: any) {
      if (error?.code === 'auth/popup-closed-by-user') {
        // Normal user cancellation - do not treat as fatal error
        return null;
      }
      const friendlyMsg = formatFirebaseAuthError(error);
      console.error('Google sign-in error:', error);
      throw new Error(friendlyMsg);
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<AuthSessionResult> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const session = await fetchUserProfile(result.user);
      setAuthNotice({
        type: 'success',
        message: session.isAdmin
          ? `Signed in as Administrator (${session.fullName}).`
          : `Welcome back, ${session.fullName}!`
      });
      return session;
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed') {
        throw new Error('Email login is not enabled in this Firebase project. Please click "Continue with Google" to sign in.');
      }
      console.error('Email sign-in error:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string, phone?: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await updateProfile(result.user, { displayName: fullName });
        const adminAccess = isAuthorizedAdminEmail(email);
        const userRef = doc(db, 'users', result.user.uid);
        const newProfile: UserProfile = {
          uid: result.user.uid,
          fullName,
          email,
          phone: phone || '',
          role: adminAccess ? 'admin' : 'guest',
          createdAt: new Date().toISOString(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
        setIsAdmin(adminAccess);
        setIsPrimaryOwner(email.toLowerCase() === PRIMARY_OWNER_EMAIL.toLowerCase());
        setAuthNotice({
          type: 'success',
          message: `Account created for ${fullName}!`
        });
      }
    } catch (error: any) {
      if (error?.code === 'auth/operation-not-allowed') {
        throw new Error('Email registration is not enabled in this Firebase project. Please click "Continue with Google" to sign in.');
      }
      console.error('Email registration error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setIsAdmin(false);
      setIsPrimaryOwner(false);
      setAuthNotice({
        type: 'info',
        message: 'You have been securely signed out.'
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        isPrimaryOwner,
        isLoading,
        authNotice,
        clearAuthNotice,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
