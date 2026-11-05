import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { AlertingService } from './alerting.service';
import { InternalApiKeyGuard } from './internal-api-key.guard';

@Controller()
export class AlertsController {
  constructor(private readonly alertingService: AlertingService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('alerts')
  @UseGuards(InternalApiKeyGuard)
  findActive(@Query('vehicleId') vehicleId?: string) {
    if (!vehicleId) {
      throw new BadRequestException('vehicleId query parameter is required');
    }
    return this.alertingService.findActiveForVehicle(vehicleId);
  }

  @Post('alerts/:id/resolve')
  @UseGuards(InternalApiKeyGuard)
  async resolve(@Param('id') id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException('Alert not found');
    }
    const alert = await this.alertingService.resolve(id);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return alert;
  }
}
