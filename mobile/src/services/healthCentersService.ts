import { HealthCenterSearchResponse } from '../types';
import { postJson } from './api';

export async function findNearbyHealthCenters(
  latitude: number,
  longitude: number,
  radiusMeters = 15000,
): Promise<HealthCenterSearchResponse> {
  return postJson<HealthCenterSearchResponse>('/api/health-centers-nearby', {
    latitude,
    longitude,
    radiusMeters,
  });
}
