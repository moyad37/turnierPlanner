import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { signInWithGoogle, signOutUser } from '../lib/firebase';

interface AuthButtonProps {
  user: User | null;
  onAuthChange: () => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ user, onAuthChange }) => {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      onAuthChange();
    } catch (e) {
      console.error('Google-Anmeldung fehlgeschlagen:', e);
      alert('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      onAuthChange();
    } finally {
      setLoading(false);
    }
  };

  if (user && !user.isAnonymous) {
    return (
      <div className="auth-user">
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt={user.displayName ?? 'User'}
            className="auth-avatar"
            referrerPolicy="no-referrer"
          />
        )}
        <span className="auth-name">{user.displayName}</span>
        <button
          type="button"
          className="header-button"
          onClick={handleSignOut}
          disabled={loading}
          title="Abmelden"
        >
          🚪
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="header-button auth-login-btn"
      onClick={handleSignIn}
      disabled={loading}
      title="Mit Google anmelden (geräteübergreifende Synchronisation)"
    >
      {loading ? '⏳' : 'G Anmelden'}
    </button>
  );
};
