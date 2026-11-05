import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Alert, AlertDocument } from './schemas/alert.schema';
import { FleetStatusClient } from './fleet-status.client';

const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  constructor(
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
    private readonly fleetStatusClient: FleetStatusClient,
  ) {}

  async checkVehicleOffline(vehicleId: string, lastSeenAt: Date) {
    const staleFor = Date.now() - lastSeenAt.getTime();
    if (staleFor <= OFFLINE_THRESHOLD_MS) {
      return null;
    }

    const openAlert = await this.alertModel
      .findOne({
        vehicleId,
        type: 'vehicle-offline',
        resolvedAt: null,
      })
      .exec();

    if (openAlert) {
      return null;
    }

    return this.alertModel.create({
      vehicleId,
      type: 'vehicle-offline',
      message: `Vehicle ${vehicleId} has not reported telemetry in over 15 minutes`,
    });
  }

  findActiveForVehicle(vehicleId: string) {
    return this.alertModel.find({ vehicleId, resolvedAt: null }).exec();
  }

  resolve(alertId: string) {
    return this.alertModel
      .findByIdAndUpdate(alertId, { resolvedAt: new Date() }, { new: true })
      .exec();
  }

  /**
   * Checks every vehicle's last-seen time and raises offline alerts as
   * needed. Called on a schedule.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepFleetForOffline() {
    this.logger.debug('Running fleet offline sweep');
    let vehicles;
    try {
      vehicles = await this.fleetStatusClient.getLastSeen();
    } catch (err) {
      this.logger.error(`Offline sweep skipped: ${(err as Error).message}`);
      return;
    }
    for (const { vehicleId, lastSeenAt } of vehicles) {
      if (lastSeenAt) {
        await this.checkVehicleOffline(vehicleId, new Date(lastSeenAt));
      }
    }
  }
}
