import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { Alert, AlertDocument } from './schemas/alert.schema';
import { TelemetryEvent, TelemetryEventDocument } from '../ingestion/schemas/telemetry-event.schema';

const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
// Widened from 15min -> 6h after ops reported repeated alert noise for
// flapping vehicles (VANTRA-441).
const DEBOUNCE_WINDOW_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  constructor(
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
    // Reaching directly into ingestion's collection here rather than going
    // through IngestionService/VehiclesService - convenient short-term, but
    // means this module now knows about telemetry's schema shape directly.
    @InjectModel(TelemetryEvent.name) private telemetryModel: Model<TelemetryEventDocument>,
  ) {}

  async checkVehicleOffline(vehicleId: string, lastSeenAt: Date) {
    const staleFor = Date.now() - lastSeenAt.getTime();
    if (staleFor <= OFFLINE_THRESHOLD_MS) {
      return null;
    }

    // At most one open offline alert per vehicle. A resolved alert never
    // blocks a new one - if the vehicle goes offline again, ops must know.
    // No time window: a window on open alerts caused re-alerting every sweep
    // once the open alert aged out (the real VANTRA-441 noise), and 3775723's
    // fix of ignoring resolvedAt hid genuine repeat outages.
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
    return this.alertModel.findByIdAndUpdate(alertId, { resolvedAt: new Date() }).exec();
  }

  /**
   * Sweeps every vehicle's most recent telemetry event and raises offline
   * alerts as needed. Called on a schedule.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepFleetForOffline() {
    this.logger.debug('Running fleet offline sweep');
    const vehicleIds: string[] = await this.telemetryModel.distinct('vehicleId').exec();
    for (const vehicleId of vehicleIds) {
      const latest = await this.telemetryModel
        .findOne({ vehicleId })
        .sort({ recordedAt: -1 })
        .exec();
      if (latest) {
        await this.checkVehicleOffline(vehicleId, latest.recordedAt);
      }
    }
  }
}
