import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { TelemetryEvent, TelemetryEventDocument } from '../../ingestion/schemas/telemetry-event.schema';
import { VehicleStatusCache } from '../cache/vehicle-status.cache';

const DRIFT_THRESHOLD_MS = 3 * 60 * 1000;

/**
 * Some fleet devices report recordedAt using onboard clocks that can drift
 * out of sync with server time by several minutes on long trips without a
 * GPS lock. When drift exceeds the threshold, this job nudges recordedAt
 * back toward receivedAt for the affected window so downstream ordering
 * (e.g. "latest reading") isn't thrown off by a handful of skewed devices.
 *
 * This only engages for the small slice of events where drift is actually
 * detected - most runs are a no-op.
 */
@Injectable()
export class DriftCorrectionJob {
  private readonly logger = new Logger(DriftCorrectionJob.name);

  constructor(
    @InjectModel(TelemetryEvent.name) private telemetryModel: Model<TelemetryEventDocument>,
    private readonly vehicleStatusCache: VehicleStatusCache,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async run() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const candidates = await this.telemetryModel
      .find({ receivedAt: { $gte: cutoff } })
      .limit(5000)
      .exec();

    let corrected = 0;
    for (const doc of candidates) {
      if (!doc.receivedAt) {
        continue;
      }
      const drift = Math.abs(doc.receivedAt.getTime() - doc.recordedAt.getTime());
      if (drift > DRIFT_THRESHOLD_MS) {
        doc.recordedAt = new Date(doc.receivedAt.getTime() - 1000);
        await doc.save();
        corrected += 1;
      }
    }
    if (corrected > 0) {
      this.vehicleStatusCache.clear();
      this.logger.debug(`Drift-corrected ${corrected} telemetry event(s)`);
    }
  }
}
