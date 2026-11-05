import { Injectable } from '@nestjs/common';
import { VehicleDocument } from '../../vehicles/schemas/vehicle.schema';

// Safety net: rebuild periodically even if every writer invalidates correctly,
// in case data changes outside this app (scripts, manual fixes).
const TTL_MS = 5 * 60 * 1000;

export type LatestReading = { vehicleId: string; recordedAt: Date };

export type VehicleStatusSnapshot = {
  vehicles: VehicleDocument[];
  latestByVehicleId: Map<string, LatestReading>;
};

/**
 * In-memory cache for GET /dashboard/vehicle-statuses.
 */
@Injectable()
export class VehicleStatusCache {
  private snapshot: VehicleStatusSnapshot | null = null;
  private loadedAt = 0;
  private loading: Promise<VehicleStatusSnapshot> | null = null;
  private pending: LatestReading[] = [];

  async get(load: () => Promise<VehicleStatusSnapshot>): Promise<VehicleStatusSnapshot> {
    if (this.snapshot && Date.now() - this.loadedAt < TTL_MS) {
      return this.snapshot;
    }
    if (!this.loading) {
      this.snapshot = null;
      this.pending = [];
      const thisLoad: Promise<VehicleStatusSnapshot> = load()
        .then((snapshot) => {
          if (this.loading !== thisLoad) {
            return snapshot;
          }
          this.snapshot = snapshot;
          this.loadedAt = Date.now();
          this.pending.forEach((event) => this.recordEvent(event));
          this.pending = [];
          return snapshot;
        })
        .finally(() => {
          if (this.loading === thisLoad) {
            this.loading = null;
          }
        });
      this.loading = thisLoad;
    }
    return this.loading;
  }

  // Keep the newest reading per vehicle. An older, out-of-order event must not
  // replace a newer one - same result the aggregation would give.
  recordEvent(event: LatestReading) {
    if (!this.snapshot) {
      if (this.loading) {
        this.pending.push(event);
      }
      return;
    }
    const current = this.snapshot.latestByVehicleId.get(event.vehicleId);
    if (!current || event.recordedAt.getTime() >= current.recordedAt.getTime()) {
      this.snapshot.latestByVehicleId.set(event.vehicleId, event);
    }
  }

  // Full invalidation, for changes that can't be applied per vehicle
  // (drift correction rewriting timestamps, a new vehicle).
  clear() {
    this.snapshot = null;
    this.loading = null;
    this.pending = [];
  }
}
