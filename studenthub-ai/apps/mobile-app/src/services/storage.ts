import * as FileSystem from 'expo-file-system/legacy';
import type { PlaceSummary } from '@studenthub/types';

/** Visit plan shape persisted on the device (mirrors context Visit). */
export interface StoredVisit {
  id: string;
  place: PlaceSummary;
  name: string;
  date: string;
  note: string;
  /** Included when the signed-in student also sent the request to the API. */
  phone?: string;
}
/** Recently viewed place entry: the place plus when it was opened. */
export interface StoredHistoryEntry {
  place: PlaceSummary;
  viewedAt: string;
}
/** Everything the app keeps between launches. */
export interface StoredState { saved: PlaceSummary[]; visits: StoredVisit[]; name: string; hasLaunched: boolean; history?: StoredHistoryEntry[]; /** Selected college name from the campus picker. */ campus?: string; }

const STATE_FILE = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}studenthub-state.json` : null;
let pending: Promise<void> = Promise.resolve();

/** Keep saves and clears in call order, even after a failed operation. */
function enqueue(operation: () => Promise<void>): Promise<void> {
  pending = pending.then(operation).catch(() => {
    // Storage unavailable: in-memory state keeps working.
  });
  return pending;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

function isPlace(value: unknown): value is PlaceSummary {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.name === 'string' && typeof value.category === 'string'
    && typeof value.address === 'string' && typeof value.latitude === 'number' && typeof value.longitude === 'number'
    && (value.price === null || typeof value.price === 'number')
    && (value.priceUnit === null || typeof value.priceUnit === 'string')
    && typeof value.rating === 'number' && typeof value.reviewCount === 'number'
    && (value.distanceKm === null || typeof value.distanceKm === 'number')
    && typeof value.imageUrl === 'string'
    && (value.gender === null || typeof value.gender === 'string')
    && typeof value.verified === 'boolean' && Array.isArray(value.facilities);
}

function isVisit(value: unknown): value is StoredVisit {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string'
    && typeof value.date === 'string' && typeof value.note === 'string' && isPlace(value.place);
}

/** Returns the stored student state, or null when missing/corrupt. Never throws. */
export async function loadStoredState(): Promise<StoredState | null> {
  try {
    await pending;
    if (!STATE_FILE) return null;
    const info = await FileSystem.getInfoAsync(STATE_FILE);
    if (!info.exists || info.isDirectory) return null;
    const raw = await FileSystem.readAsStringAsync(STATE_FILE, { encoding: FileSystem.EncodingType.UTF8 });
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    const saved = Array.isArray(parsed.saved) ? parsed.saved.filter(isPlace) : [];
    const visits = Array.isArray(parsed.visits) ? parsed.visits.filter(isVisit) : [];
    const history = Array.isArray(parsed.history)
      ? parsed.history.filter((entry: unknown) => isRecord(entry) && typeof entry.viewedAt === 'string' && isPlace(entry.place))
        .map((entry: { place: PlaceSummary; viewedAt: string }) => ({ place: entry.place, viewedAt: entry.viewedAt }))
        .slice(0, 20)
      : [];
    const name = typeof parsed.name === 'string' ? parsed.name.slice(0, 50) : '';
    const hasLaunched = parsed.hasLaunched === true;
    const campus = typeof parsed.campus === 'string' ? parsed.campus.slice(0, 80) : '';
    if (saved.length === 0 && visits.length === 0 && history.length === 0 && name === '' && !hasLaunched && !campus) return null;
    return { saved, visits, name, hasLaunched, history, campus };
  } catch {
    return null;
  }
}

/** Snapshot now; write in call order. Failures never break in-memory use. */
export async function saveStoredState(state: StoredState): Promise<void> {
  if (!STATE_FILE) return;
  try {
    const contents = JSON.stringify(state);
    const file = STATE_FILE;
    await enqueue(() => FileSystem.writeAsStringAsync(file, contents, { encoding: FileSystem.EncodingType.UTF8 }));
  } catch {
    // Invalid input or unavailable storage: keep working without persistence.
  }
}

/** Clear after preceding writes, so a stale save cannot restore deleted data. */
export async function clearStoredState(): Promise<void> {
  if (!STATE_FILE) return;
  const file = STATE_FILE;
  await enqueue(() => FileSystem.deleteAsync(file, { idempotent: true }));
}
