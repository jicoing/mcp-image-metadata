import type { GpsData } from '../types.js';

export async function reverseGeocode(gps: GpsData): Promise<string | undefined> {
  if (!gps.latitude || !gps.longitude) return undefined;
  
  return `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`;
}

export function formatGpsCoordinates(gps: GpsData): string {
  if (!gps.latitude || !gps.longitude) return 'Unknown';
  
  const latDir = gps.latitude >= 0 ? 'N' : 'S';
  const lonDir = gps.longitude >= 0 ? 'E' : 'W';
  
  return `${Math.abs(gps.latitude).toFixed(6)}° ${latDir}, ${Math.abs(gps.longitude).toFixed(6)}° ${lonDir}`;
}

export function isValidGps(gps: GpsData): boolean {
  if (gps.latitude === undefined || gps.longitude === undefined) return false;
  return (
    gps.latitude >= -90 &&
    gps.latitude <= 90 &&
    gps.longitude >= -180 &&
    gps.longitude <= 180
  );
}