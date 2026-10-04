import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type {
  AdminCollegeSummary,
  AdminOverview,
  AdminOwnerSummary,
  AdminPlaceSummary,
  PlaceStatus,
} from '@studenthub/types';
import { useStudent } from './StudentContext';
import {
  fetchAdminColleges,
  fetchAdminOwners,
  fetchAdminOverview,
  fetchAdminPlaces,
} from '../services/admin';

/**
 * Admin panel state, mounted only for ADMIN sessions.
 *
 * Shares the student session (same token and storage); the ADMIN role in the
 * token is what authorises every call. Overview, moderation queue, owners, and
 * colleges are fetched together so the tab badges always agree.
 */
function useAdminState() {
  const { session } = useStudent();
  const isAdmin = session?.user.role === 'ADMIN';
  const token = isAdmin ? (session?.token ?? null) : null;
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [places, setPlaces] = useState<AdminPlaceSummary[]>([]);
  const [placeCounts, setPlaceCounts] = useState<Partial<Record<PlaceStatus, number>>>({});
  const [owners, setOwners] = useState<AdminOwnerSummary[]>([]);
  const [colleges, setColleges] = useState<AdminCollegeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
        // Unreachable API: the screen shows its retry state.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, refreshKey]);

  const refresh = () => setRefreshKey((value) => value + 1);

  return { token, isAdmin, overview, places, placeCounts, owners, colleges, loading, refresh };
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
