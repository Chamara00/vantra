import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AlertingClient } from './alerting.client';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertingController {
  constructor(private readonly alertingClient: AlertingClient) {}

  @Get(':vehicleId')
  findActive(@Param('vehicleId') vehicleId: string) {
    return this.alertingClient.findActiveForVehicle(vehicleId);
  }
}
