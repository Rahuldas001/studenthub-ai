import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  College,
  LoginInput,
  OwnerRegisterInput,
  PlaceSummary,
  RegisterInput,
} from '@studenthub/types';
import {
  DEFAULT_LOCATION,
  fetchColleges,
  loadPlaces,
  nearestCollege,
  type StudentLocation,
} from '../services/places';
import { useDeviceLocation } from '../services/location';
import { apiConfigured, apiRequest } from '../services/api';
import {
  clearSession,
  loadSession,
  loginAccount,
  registerAccount,
  registerOwnerAccount,
  saveSession,
  deleteAccount,
  type StoredSession,
} from '../services/auth';
import { clearStoredState, loadStoredState, saveStoredState, type StoredHistoryEntry, type StoredVisit } from '../services/storage';

/** A personal visit plan; also sent to the API when signed in. */
export type Visit = StoredVisit;
function useStudentState() {
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('Loading places…');
  const [retry, setRetry] = useState(0);
  const [saved, setSaved] = useState<PlaceSummary[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [history, setHistory] = useState<StoredHistoryEntry[]>([]);
  const [name, setName] = useState('');
  const [campus, setCampus] = useState('');
  /** City + coordinates discovery is centred on (detected on launch, or picked). */
  const [location, setLocation] = useState<StudentLocation>(DEFAULT_LOCATION);
  const [colleges, setColleges] = useState<College[]>([]);
  /** True once a previously saved location was restored; blocks auto-detection. */
  const [restoredLocation, setRestoredLocation] = useState(false);
  const deviceLocation = useDeviceLocation();
  const [hasLaunched, setHasLaunched] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all([loadStoredState(), loadSession()]).then(([state, auth]) => {
      if (!active) return;
      if (state) { setSaved(state.saved); setVisits(state.visits); setName(state.name); setHasLaunched(state.hasLaunched); setHistory(state.history ?? []); setCampus(state.campus ?? ''); if (state.location) { setLocation(state.location); setRestoredLocation(true); } }
      setSession(auth);
    }).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);
  /** Launch cities for the location picker; falls back to the bundled list. */
  useEffect(() => {
    let active = true;
    fetchColleges()
      .then((rows) => { if (active && rows.length) setColleges(rows); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  /**
   * On launch, turn a device fix into the nearest launch city so a student in
   * Dhubri lands on Dhubri. Skipped when a location was already saved or when
   * the student denies location access; discovery then falls back to Guwahati.
   */
  useEffect(() => {
    if (!hydrated || restoredLocation) return;
    if (!deviceLocation?.granted || colleges.length === 0) return;
    const nearest = nearestCollege(colleges, deviceLocation.latitude, deviceLocation.longitude);
    if (nearest) setLocation({ city: nearest.city, latitude: nearest.latitude, longitude: nearest.longitude });
  }, [hydrated, restoredLocation, deviceLocation, colleges]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    setLoading(true);
    // Discovery is centred on the chosen location, so launching in Dhubri
    // requests listings near Dhubri rather than the Guwahati default.
    loadPlaces(controller.signal, location).then((result) => {
      if (active) { setPlaces(result.places); setSource(result.source); }
    }).catch((problem: unknown) => {
      if (!active) return;
      setPlaces([]);
      setSource(problem instanceof Error ? problem.message : 'Could not load places.');
    }).finally(() => { clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [retry, location]);
  useEffect(() => {
    if (!hydrated) return;
    if (!saved.length && !visits.length && !history.length && !name && !hasLaunched && !campus && !restoredLocation && location.city === DEFAULT_LOCATION.city) { void clearStoredState(); return; }
    void saveStoredState({ saved, visits, name, hasLaunched, history, campus, location });
  }, [hydrated, saved, visits, name, hasLaunched, campus, history, restoredLocation, location]);
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
      applySession(await registerAccount({ ...input, city: input.city ?? location.city }));
    } finally {
      setAuthBusy(false);
    }
  };
  const signUpOwner = async (input: OwnerRegisterInput) => {
    setAuthBusy(true);
    try {
      applySession(await registerOwnerAccount({ ...input, city: input.city ?? location.city }));
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
  /**
   * Signs out and replays Welcome.
   *
   * Clearing the "launched" flag makes `App` fall back to its welcome stage, so
   * logging out lands on the first screen again (and on the next launch too)
   * without clearing the device's saved places.
   */
  const signOutToWelcome = () => {
    signOut();
    setHasLaunched(false);
  };
  /**
   * Permanently deletes the signed-in account, on the server and on this device.
   *
   * Google Play requires users to be able to remove their account from inside
   * the app, so this does the whole job: the API call first (it needs a live
   * session token), then the local file is wiped and every piece of state that
   * belonged to the account — saved places, visit plans, history, name, campus
   * and chosen location — is reset. The app returns to the Welcome screen and
   * next launch starts clean.
   *
   * Throws on failure so the screen can show the reason; nothing local is
   * cleared unless the server confirmed the deletion.
   */
  const deleteAccountAndSignOut = async () => {
    if (!session) throw new Error('Sign in to delete your account.');
    setAuthBusy(true);
    try {
      await deleteAccount(session.token);
      await clearStoredState();
      setSession(null);
      void clearSession();
      setSaved([]);
      setVisits([]);
      setHistory([]);
      setName('');
      setCampus('');
      setLocation(DEFAULT_LOCATION);
      setHasLaunched(false);
    } finally {
      setAuthBusy(false);
    }
  };
  return {
    hydrated, places, loading, source, refresh: () => setRetry((value) => value + 1),
    saved, savedIds, toggleSaved,
    visits, addVisit,
    cancelVisit: (id: string) => setVisits((current) => current.filter((visit) => visit.id !== id)),
    name, setName, clearActivity: () => { setSaved([]); setVisits([]); setName(''); setHistory([]); },
    campus, setCampus,
    location, colleges,
    /** Sets the discovery location from the campus picker (persisted on device). */
    chooseLocation: (next: StudentLocation) => setLocation(next),
    history, trackRecent, clearHistory: () => setHistory([]),
    session, authBusy, signIn, signUp, signUpOwner, setSessionOwner, signOut, signOutToWelcome,
    deleteAccountAndSignOut,
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
