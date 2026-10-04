import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  AdminCollegeSummary,
  AdminOverview,
  AdminOwnerSummary,
  AdminPlaceSummary,
  PlaceStatus,
} from '@studenthub/types';
import { useSession } from './SessionContext';
import {
  fetchAdminColleges,
  fetchAdminOwners,
  fetchAdminOverview,
  fetchAdminPlaces,
} from './admin';

/**
 * Admin panel state — ported from `apps/mobile-app/src/context/AdminContext.tsx`.
 *
 * The mobile console shares the student context's session; this app keeps its
 * own localStorage session, but the effect is the same: overview, moderation
 * queue, owners and colleges are fetched together so the sidebar badges and
 * overview tiles always agree. Mounted only for ADMIN sessions (App.tsx gates).
 */
function useAdminState() {
  const { session } = useSession();
  const isAdmin = session?.user.role === 'ADMIN';
  const token = isAdmin ? (session?.token ?? null) : null;
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [places, setPlaces] = useState<AdminPlaceSummary[]>([]);
  const [placeCounts, setPlaceCounts] = useState<Partial<Record<PlaceStatus, number>>>({});
  const [owners, setOwners] = useState<AdminOwnerSummary[]>([]);
  const [colleges, setColleges] = useState<AdminCollegeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  // Sample data fills only the dashboard widgets the API cannot feed (monthly
  // growth, deltas, named booking rows, notifications). Defaults on so the
  // console matches the reference out of the box; every sample surface is
  // badged and the toggle turns it off for a strictly real-data view.
  const [sampleOn, setSampleOn] = useState(true);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    Promise.all([
      fetchAdminOverview(token),
      fetchAdminPlaces(token),
      fetchAdminOwners(token),
      fetchAdminColleges(token),
    ])
      .then(([summary, queue, businesses, geography]) => {
        if (!active) return;
        setOverview(summary);
        setPlaces(queue.places);
        setPlaceCounts(queue.counts);
        setOwners(businesses.owners);
        setColleges(geography);
      })
      .catch(() => {
        // Unreachable API: the shell shows its retry state.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  return { token, isAdmin, overview, places, placeCounts, owners, colleges, loading, refresh, sampleOn, setSampleOn };
}

const AdminContext = createContext<ReturnType<typeof useAdminState> | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  return <AdminContext.Provider value={useAdminState()}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('AdminProvider is required');
  return value;
}