import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelemetryEvent, TelemetryEventSchema } from '../ingestion/schemas/telemetry-event.schema';
import { DriftCorrectionJob } from './jobs/drift-correction.job';
import { VehicleStatusCacheModule } from './cache/vehicle-status-cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TelemetryEvent.name, schema: TelemetryEventSchema }]),
    VehicleStatusCacheModule,
  ],
  providers: [DriftCorrectionJob],
})
export class CommonModule {}
