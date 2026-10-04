import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface DeviceLocation { latitude: number; longitude: number; granted: boolean }

/** Result of a location request that was refused or unavailable. */
const DENIED: DeviceLocation = { latitude: 0, longitude: 0, granted: false };

/**
 * Asks for foreground location permission and returns a single fix.
 *
 * Exposed so screens (the registration location card, the campus picker) can
 * show a real prompt and re-request after an earlier refusal. Never throws:
 * denial, timeout and unavailable hardware all resolve to `granted: false`.
 */
export async function requestDeviceLocation(): Promise<DeviceLocation> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return DENIED;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      granted: true,
    };
  } catch {
    return DENIED;
  }
}

/**
 * One-shot device location on mount. Never throws: permission denial, timeout,
 * or unavailability all resolve to `{ granted: false }` and the app keeps
 * centering on campus.
 */
export function useDeviceLocation(): DeviceLocation | null {
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  useEffect(() => {
    let active = true;
    requestDeviceLocation().then((fix) => {
      if (active) setLocation(fix);
    });
    return () => { active = false; };
  }, []);
  return location && location.granted ? { latitude: location.latitude, longitude: location.longitude, granted: true } : location;
}