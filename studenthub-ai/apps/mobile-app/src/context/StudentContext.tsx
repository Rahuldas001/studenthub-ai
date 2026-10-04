import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  LoginInput,
  OwnerRegisterInput,
  PlaceSummary,
  RegisterInput,
} from '@studenthub/types';
import { DEMO_PLACES, loadPlaces } from '../services/places';
import { apiConfigured, apiRequest } from '../services/api';
import {
  clearSession,
  loadSession,
  loginAccount,
  registerAccount,
  registerOwnerAccount,
  saveSession,
  type StoredSession,
} from '../services/auth';
import { clearStoredState, loadStoredState, saveStoredState, type StoredHistoryEntry, type StoredVisit } from '../services/storage';

/** A personal visit plan; also sent to the API when signed in. */
export type Visit = StoredVisit;
function useStudentState() {
  const [places, setPlaces] = useState<PlaceSummary[]>(DEMO_PLACES);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('Loading places…');
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<PlaceSummary[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [history, setHistory] = useState<StoredHistoryEntry[]>([]);
  const [name, setName] = useState('');
  const [campus, setCampus] = useState('');
  const [hasLaunched, setHasLaunched] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([loadStoredState(), loadSession()]).then(([state, auth]) => {
      if (!active) return;
      if (state) { setSaved(state.saved); setVisits(state.visits); setName(state.name); setHasLaunched(state.hasLaunched); setHistory(state.history ?? []); setCampus(state.campus ?? ''); }
      setSession(auth);
    }).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    setLoading(true);
    loadPlaces(controller.signal).then((result) => {
      if (active) { setPlaces(result.places); setSource(result.source); }
    }).catch(() => {
      if (active) { setPlaces(DEMO_PLACES); setSource('API unavailable · fictional offline listings'); }
    }).finally(() => { clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [retry]);
  useEffect(() => {
    if (!hydrated) return;
    if (!saved.length && !visits.length && !history.length && !name && !hasLaunched && !campus) { void clearStoredState(); return; }
    void saveStoredState({ saved, visits, name, hasLaunched, history, campus });
  }, [hydrated, saved, visits, name, hasLaunched, campus]);
  const savedIds = useMemo(() => new Set(saved.map((place) => place.id)), [saved]);
  /** Records a place view for Recently Viewed: newest first, deduped, capped at 20. */
  const trackRecent = (place: PlaceSummary) => {
    setHistory((current) => [
      { place, viewedAt: new Date().toISOString() },
      ...current.filter((entry) => entry.place.id !== place.id),
    ].slice(0, 20));
  };
  /** Saved places sync to the server only for signed-in students with an API. */
  const toggleSaved = (place: PlaceSummary) => {
    const exists = saved.some((item) => item.id === place.id);
    setSaved(exists ? saved.filter((item) => item.id !== place.id) : [...saved, place]);
    if (session && apiConfigured()) {
      void (exists
        ? apiRequest(`/favorites/${place.id}`, { method: 'DELETE', token: session.token }).catch(() => undefined)
        : apiRequest('/favorites', { method: 'POST', body: { placeId: place.id }, token: session.token }).catch(() => undefined));
    }
  };
  const addVisit = (visit: Omit<Visit, 'id'>) => {
    setVisits((current) => [...current, { ...visit, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }]);
    if (session && apiConfigured() && visit.phone) {
      void apiRequest('/visit-requests', {
        method: 'POST',
        token: session.token,
        body: {
          placeId: visit.place.id,
          name: visit.name,
          phone: visit.phone,
          preferredDate: visit.date || undefined,
          note: visit.note || undefined,
        },
      }).catch(() => undefined);
    }
  };
  /** Stores the session and pushes device-saved places (idempotent upserts). */
  const applySession = (next: StoredSession) => {
    setSession(next);
    void saveSession(next);
    setName((current) => current || next.user.displayName);
    if (apiConfigured()) {
      for (const place of saved) {
        void apiRequest('/favorites', { method: 'POST', body: { placeId: place.id }, token: next.token }).catch(() => undefined);
      }
    }
  };
  const signIn = async (identifier: string, password: string) => {
    setAuthBusy(true);
    try {
      applySession(await loginAccount({ identifier, password }));
    } finally {
      setAuthBusy(false);
    }
  };
  const signUp = async (input: RegisterInput) => {
    setAuthBusy(true);
    try {
      applySession(await registerAccount(input));
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
  /** Caches the resolved business profile so owner screens skip a fetch. */
  const setSessionOwner = (owner: StoredSession['owner']) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, owner };
      void saveSession(next);
      return next;
    });
  };
  const signOut = () => {
    setSession(null);
    void clearSession();
  };
  return {
    hydrated, places, loading, source, refresh: () => setRetry((value) => value + 1),
    saved, savedIds, toggleSaved,
    visits, addVisit,
    cancelVisit: (id: string) => setVisits((current) => current.filter((visit) => visit.id !== id)),
    name, setName, clearActivity: () => { setSaved([]); setVisits([]); setName(''); setHistory([]); },
    campus, setCampus,
    history, trackRecent, clearHistory: () => setHistory([]),
    session, authBusy, signIn, signUp, signUpOwner, setSessionOwner, signOut,
    hasLaunched,
    /** Persist that Welcome was completed so it shows once per device. */
    completeWelcome: () => setHasLaunched(true),
    /** Clear the welcome flag (replay/debug) without touching other data. */
    resetWelcome: () => setHasLaunched(false),
  };
}
const StudentContext = createContext<ReturnType<typeof useStudentState> | null>(null);
export function StudentProvider({ children }: { children: ReactNode }) {
  return <StudentContext.Provider value={useStudentState()}>{children}</StudentContext.Provider>;
}
export function useStudent() {
  const value = useContext(StudentContext);
  if (!value) throw new Error('StudentProvider is required');
  return value;
}
