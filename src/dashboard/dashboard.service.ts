import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VehiclesService } from '../vehicles/vehicles.service';
import { TelemetryEvent, TelemetryEventDocument } from '../ingestion/schemas/telemetry-event.schema';
import { VehicleStatusCache, VehicleStatusSnapshot } from '../common/cache/vehicle-status.cache';

@Injectable()
export class DashboardService {
  constructor(
    private readonly vehiclesService: VehiclesService,
    @InjectModel(TelemetryEvent.name) private telemetryModel: Model<TelemetryEventDocument>,
    private readonly vehicleStatusCache: VehicleStatusCache,
  ) {}

  async getFleetOverview() {
    return this.vehiclesService.findAll();
  }

  /**
   * Returns the latest known telemetry reading for every vehicle in the fleet.
   * This is the most frequently hit read on the dashboard.
   */
  async getVehicleStatuses() {
    const { vehicles, latestByVehicleId } = await this.vehicleStatusCache.get(() =>
      this.loadVehicleStatuses(),
    );
    return vehicles.map((vehicle) => ({
      vehicle,
      latest: latestByVehicleId.get(vehicle.vehicleId) ?? null,
    }));
  }

  async getVehicleLastSeen() {
    const { vehicles, latestByVehicleId } = await this.vehicleStatusCache.get(() =>
      this.loadVehicleStatuses(),
    );
    return vehicles.map((vehicle) => ({
      vehicleId: vehicle.vehicleId,
      lastSeenAt: latestByVehicleId.get(vehicle.vehicleId)?.recordedAt ?? null,
    }));
  }

  private async loadVehicleStatuses(): Promise<VehicleStatusSnapshot> {
    const vehicles = await this.vehiclesService.findAll();

    // One aggregation instead of one query per vehicle. The $sort matches the
    // { vehicleId: 1, recordedAt: -1 } index, so $first is each vehicle's newest event.
    const latestPerVehicle = await this.telemetryModel
      .aggregate([
        { $sort: { vehicleId: 1, recordedAt: -1 } },
        { $group: { _id: '$vehicleId', latest: { $first: '$$ROOT' } } },
      ])
      .exec();
    const latestByVehicleId = new Map(latestPerVehicle.map((g) => [g._id, g.latest]));

    return { vehicles, latestByVehicleId };
  }
}
