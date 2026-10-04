import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LoginInput, OwnerProfile, OwnerRegisterInput } from '@studenthub/types';
import {
  clearSession,
  loadSession,
  loginAccount,
  registerOwnerAccount,
  saveSession,
  type StoredSession,
} from './auth';

/**
 * Session state for the standalone owner dashboard.
 *
 * The mobile app keeps its session in file storage with the full student
 * context beside it; this app only needs the owner slice (sign in, register a
 * business, cache the business profile, sign out) backed by localStorage.
 */
function useSessionState() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setHydrated(true);
  }, []);

  const applySession = (next: StoredSession) => {
    setSession(next);
    saveSession(next);
  };

  const signIn = async (identifier: string, password: string) => {
    setAuthBusy(true);
    try {
      applySession(await loginAccount({ identifier, password }));
    } finally {
      setAuthBusy(false);
    }
  };

  const signUpOwner = async (input: OwnerRegisterInput) => {
    setAuthBusy(true);
    try {
      applySession(await registerOwnerAccount(input));
    } finally {
      setAuthBusy(false);
    }
  };

  /** Caches the resolved business profile so screens skip a refetch. */
  const setSessionOwner = (owner: OwnerProfile | undefined) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, owner };
      saveSession(next);
      return next;
    });
  };

  const signOut = () => {
    setSession(null);
    clearSession();
  };

  return { session, authBusy, hydrated, signIn, signUpOwner, setSessionOwner, signOut };
}

const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  return <SessionContext.Provider value={useSessionState()}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is required');
  return value;
}

export type { LoginInput };
