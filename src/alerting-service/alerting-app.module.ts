import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertsController } from './alerts.controller';
import { AlertingService } from './alerting.service';
import { FleetStatusClient } from './fleet-status.client';
import { Alert, AlertSchema } from './schemas/alert.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/vantra'),
    MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
  ],
  controllers: [AlertsController],
  providers: [AlertingService, FleetStatusClient],
})
export class AlertingAppModule {}
