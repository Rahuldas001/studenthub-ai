import type { PlaceStatus } from '@studenthub/types';

/**
 * Fenced sample data for the dashboard widgets the API cannot feed.
 *
 * The console is real-data-first: every number it shows normally comes from
 * `/api/admin/*`. A handful of the reference dashboard's widgets need data the
 * backend does not store — a month-over-month growth series, per-cent deltas,
 * named recent-booking rows, a review feed, a notification stream and map pins.
 * Rather than invent those silently, they live here and are only rendered when
 * an operator flips **Sample data** on in the header (default on so the panel
 * matches the reference out of the box). Every sample surface is badged, and
 * nothing in this file ever reaches an API call.
 *
 * The names, prices and places mirror the seeded development data
 * (`backend/prisma/seed.ts`) so the console reads like one product.
 */

/** Per-cent change vs the previous period, shown on the four stat cards. */
export const SAMPLE_DELTAS = { users: 18, listings: 12, bookings: 24, reviews: 16 } as const;

/** Five-month platform growth series for the `Platform Growth` line chart. */
export const SAMPLE_GROWTH = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  users: [980, 1120, 1290, 1470, 1680],
  listings: [210, 268, 322, 402, 512],
  bookings: [96, 128, 168, 214, 286],
} as const;

/** Recent-booking rows for the `Recent Bookings` table. */
export interface SampleBooking {
  id: string;
  student: string;
  course: string;
  place: string;
  date: string;
  status: string;
}

export const SAMPLE_BOOKINGS: SampleBooking[] = [
  { id: 'b1', student: 'Rahul Sharma', course: 'B.Tech, GU', place: 'The Food Corner', date: 'May 12, 2025', status: 'Confirmed' },
  { id: 'b2', student: 'Anita Das', course: 'BCA, GU', place: 'Green Valley PG', date: 'May 10, 2025', status: 'Active' },
  { id: 'b3', student: 'Vikram Singh', course: 'MBA, GU', place: 'Campus Café', date: 'May 8, 2025', status: 'Pending' },
  { id: 'b4', student: 'Sneha Roy', course: 'B.Tech, GU', place: 'Modern Stay PG', date: 'May 6, 2025', status: 'Confirmed' },
  { id: 'b5', student: 'Amit Kumar', course: 'BBA, GU', place: 'City Pharmacy', date: 'May 2, 2025', status: 'Completed' },
];

/** Review-feed rows for the `Notifications` / review panel. */
export interface SampleReview {
  id: string;
  author: string;
  rating: number;
  place: string;
  time: string;
}

export const SAMPLE_REVIEWS: SampleReview[] = [
  { id: 'r1', author: 'Priya S.', rating: 4.8, place: 'The Food Corner', time: '2 mins ago' },
  { id: 'r2', author: 'Rohan M.', rating: 4.6, place: 'Green Valley PG', time: '1 hour ago' },
  { id: 'r3', author: 'Neha K.', rating: 4.7, place: 'Campus Café', time: '3 hours ago' },
];

/** Activity timeline entries (icon + tone + wording). */
export interface SampleActivity {
  id: string;
  tone: 'green' | 'orange' | 'pink' | 'blue';
  icon: string;
  title: string;
  detail: string;
  time: string;
}

export const SAMPLE_ACTIVITY: SampleActivity[] = [
  { id: 'a1', tone: 'green', icon: '＋', title: 'New listing added', detail: 'Green Valley PG was published', time: '2 mins ago' },
  { id: 'a2', tone: 'orange', icon: '✓', title: 'Booking confirmed', detail: 'Campus Café · Room 2', time: '12 mins ago' },
  { id: 'a3', tone: 'pink', icon: '★', title: 'New review submitted', detail: '4.8 rating for The Food Corner', time: '28 mins ago' },
  { id: 'a4', tone: 'blue', icon: '☺', title: 'User registered', detail: 'rahul.kumar@example.com', time: '1 hour ago' },
];

/** Notification stream entries (session-independent, illustrative). */
export interface SampleNotification {
  id: string;
  tone: 'blue' | 'green' | 'orange' | 'pink';
  icon: string;
  title: string;
  body: string;
  time: string;
}

export const SAMPLE_NOTIFICATIONS: SampleNotification[] = [
  { id: 'n1', tone: 'blue', icon: '☺', title: 'New user registered', body: 'sneha.roy@gmail.com', time: '2 mins ago' },
  { id: 'n2', tone: 'green', icon: '✓', title: 'Booking confirmed', body: '#BK-1024 · Green Valley PG', time: '15 mins ago' },
  { id: 'n3', tone: 'orange', icon: '★', title: 'New review added', body: '4.7 rating for Campus Café', time: '32 mins ago' },
  { id: 'n4', tone: 'pink', icon: '💼', title: 'Business request', body: 'City Pharmacy wants to join', time: '1 hour ago' },
];

/** Fallback status colours for the sample booking table. */
export const SAMPLE_BOOKING_STATUS_COLORS: Record<string, { fg: string; bg: string }> = {
  Confirmed: { fg: '#15815E', bg: '#E7F7EE' },
  Active: { fg: '#1D4ED8', bg: '#E0EAFF' },
  Pending: { fg: '#946600', bg: '#FFF6DC' },
  Completed: { fg: '#5B5470', bg: '#EFECF7' },
};

/** Drop a listing status into the sample table vocabulary (unused statuses safe). */
export const PLACE_STATUS_TO_SAMPLE: Partial<Record<PlaceStatus, string>> = {
  ACTIVE: 'Active', PENDING: 'Pending', INACTIVE: 'Completed', REJECTED: 'Rejected', DRAFT: 'Draft',
};
