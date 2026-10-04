import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export interface DeviceLocation { latitude: number; longitude: number; granted: boolean }

/**
 * One-shot device location. Never throws: permission denial, timeout, or
 * unavailability all resolve to `{ granted: false }` and the app keeps
 * centering on campus.
 */
export function useDeviceLocation(): DeviceLocation | null {
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) { if (active) setLocation({ latitude: 0, longitude: 0, granted: false }); return; }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude, granted: true });
      } catch {
        if (active) setLocation({ latitude: 0, longitude: 0, granted: false });
      }
    })();
    return () => { active = false; };
  }, []);
  return location && location.granted ? { latitude: location.latitude, longitude: location.longitude, granted: true } : location;
}