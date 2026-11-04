import { Module } from '@nestjs/common';
import { VehicleStatusCache } from './vehicle-status.cache';

@Module({
  providers: [VehicleStatusCache],
  exports: [VehicleStatusCache],
})
export class VehicleStatusCacheModule {}
