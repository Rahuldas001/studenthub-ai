import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { LoginInput } from '@studenthub/types';
import { clearSession, loadSession, loginAccount, saveSession, type StoredSession } from './auth';

/**
 * Session state for the standalone admin panel.
 *
 * Same shape as the owner dashboard's session context, minus the registration
 * flow: admins do not self-register, so this is sign-in, persist, sign-out —
 * backed by localStorage instead of the mobile app's file storage.
 */
function useSessionState() {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setHydrated(true);
  }, []);

  const signIn = async (identifier: string, password: string) => {
    setAuthBusy(true);
    try {
      const next = await loginAccount({ identifier, password });
      setSession(next);
      saveSession(next);
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = () => {
    setSession(null);
    clearSession();
  };

  return { session, authBusy, hydrated, signIn, signOut };
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