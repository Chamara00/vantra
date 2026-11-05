import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AlertingClient } from '../alerting.client';

@Controller('admin/vehicles')
@UseGuards(JwtAuthGuard)
export class RecalibrateController {
  constructor(private readonly alertingClient: AlertingClient) {}

  @Post(':vehicleId/force-recalibrate')
  async forceRecalibrate(@Param('vehicleId') vehicleId: string) {
    const active = await this.alertingClient.findActiveForVehicle(vehicleId);
    await Promise.all(active.map((a) => this.alertingClient.resolve(a._id)));
    return { vehicleId, recalibrated: true, clearedAlerts: active.length };
  }
}
