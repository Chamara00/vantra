import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { TelemetryEvent, TelemetryEventSchema } from '../ingestion/schemas/telemetry-event.schema';
import { VehicleStatusCacheModule } from '../common/cache/vehicle-status-cache.module';

@Module({
  imports: [
    VehiclesModule,
    MongooseModule.forFeature([{ name: TelemetryEvent.name, schema: TelemetryEventSchema }]),
    VehicleStatusCacheModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
