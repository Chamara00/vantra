import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { TelemetryEvent, TelemetryEventSchema } from './schemas/telemetry-event.schema';
import { VehicleStatusCacheModule } from '../common/cache/vehicle-status-cache.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: TelemetryEvent.name, schema: TelemetryEventSchema }]),
    VehicleStatusCacheModule,
  ],
  controllers: [IngestionController],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
