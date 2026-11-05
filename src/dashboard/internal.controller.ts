import { Controller, Get, UseGuards } from '@nestjs/common';
import { InternalApiKeyGuard } from '../common/internal-api-key.guard';
import { DashboardService } from './dashboard.service';

// Service-to-service endpoints (not for dashboard users).
@Controller('internal')
@UseGuards(InternalApiKeyGuard)
export class InternalController {
  constructor(private readonly dashboardService: DashboardService) {}

  // Used by the alerting service's offline sweep.
  @Get('vehicle-last-seen')
  getVehicleLastSeen() {
    return this.dashboardService.getVehicleLastSeen();
  }
}
