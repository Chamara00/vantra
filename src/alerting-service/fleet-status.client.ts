import { Injectable } from '@nestjs/common';

export type VehicleLastSeen = { vehicleId: string; lastSeenAt: string | null };

const TIMEOUT_MS = 10_000;

// Calls the monolith's internal API (GET /internal/vehicle-last-seen).
@Injectable()
export class FleetStatusClient {
  private readonly baseUrl = process.env.MONOLITH_URL || 'http://localhost:3000';

  async getLastSeen(): Promise<VehicleLastSeen[]> {
    const res = await fetch(`${this.baseUrl}/internal/vehicle-last-seen`, {
      headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY ?? '' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Monolith returned ${res.status}`);
    }
    return (await res.json()) as VehicleLastSeen[];
  }
}
