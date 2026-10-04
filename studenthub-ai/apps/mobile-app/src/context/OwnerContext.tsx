import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  OwnerPlaceSummary,
  OwnerProfile,
  OwnerVisitRequest,
  PlaceStatus,
  VisitRequestStatus,
} from '@studenthub/types';
import { useStudent } from './StudentContext';
import {
  fetchOwnerPlaces,
  fetchOwnerProfile,
  fetchOwnerVisitRequests,
} from '../services/owner';

/**
 * Owner dashboard state, mounted only for OWNER sessions.
 *
 * Reuses the student session (same token, same storage); the OWNER role in
 * the token is what authorises every call. Registration flows through
 * `signUpOwner` on the student context so the session lifecycle stays in one
 * place; this hook owns profile onboarding, listing reads, and the inbox.
 */
function useOwnerState() {
  const { session, setSessionOwner } = useStudent();
  const token = session?.token ?? null;
  const [profile, setProfile] = useState<OwnerProfile | null>(session?.owner ?? null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [places, setPlaces] = useState<OwnerPlaceSummary[]>([]);
  const [placeCounts, setPlaceCounts] = useState<Partial<Record<PlaceStatus, number>>>({});
  const [requests, setRequests] = useState<OwnerVisitRequest[]>([]);
  const [requestCounts, setRequestCounts] = useState<Partial<Record<VisitRequestStatus, number>>>({});

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    Promise.all([
      fetchOwnerProfile(token),
      fetchOwnerPlaces(token),
      fetchOwnerVisitRequests(token, { status: 'PENDING' }),
    ])
      .then(([owner, listings, inbox]) => {
        if (!active) return;
        setProfile(owner);
        if (owner) setSessionOwner(owner);
        setPlaces(listings.places);
        setPlaceCounts(listings.counts);
        setRequests(inbox.requests);
        setRequestCounts(inbox.counts);
      })
      .catch(() => {
        // Offline or unreachable API: dashboard shows the retry empty state.
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // setSessionOwner is stable per render cycle; token/refresh drive refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  return { token, profile, loading, places, placeCounts, requests, requestCounts, refresh, setProfile };
}

const OwnerContext = createContext<ReturnType<typeof useOwnerState> | null>(null);
export function OwnerProvider({ children }: { children: ReactNode }) {
  return <OwnerContext.Provider value={useOwnerState()}>{children}</OwnerContext.Provider>;
}
export function useOwner() {
  const value = useContext(OwnerContext);
  if (!value) throw new Error('OwnerProvider is required');
  return value;
}