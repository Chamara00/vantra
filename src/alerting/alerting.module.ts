import { Module } from '@nestjs/common';
import { AlertingController } from './alerting.controller';
import { AlertingClient } from './alerting.client';
import { RecalibrateController } from './admin/recalibrate.controller';

// Alerting runs as a standalone service (src/alerting-service). This module
// keeps the monolith's public alert endpoints and forwards them over HTTP.
@Module({
  controllers: [AlertingController, RecalibrateController],
  providers: [AlertingClient],
})
export class AlertingModule {}
