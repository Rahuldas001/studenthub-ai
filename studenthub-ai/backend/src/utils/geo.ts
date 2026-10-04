import type { Coordinates } from './types.js';

/** Mean Earth radius in kilometres. */
const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance between two coordinates (Haversine).
 *
 * V1 uses this for "distance from college" and radius filtering. PostGIS or a
 * bounding-box query can replace it once the dataset grows.
 */
export function distanceInKm(
  from: Coordinates,
  to: Coordinates,
  precision = 1,
): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  const factor = 10 ** precision;
  return Math.round(distance * factor) / factor;
}