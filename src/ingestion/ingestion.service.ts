import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelemetryEvent, TelemetryEventDocument } from './schemas/telemetry-event.schema';
import { IngestTelemetryDto } from './dto/ingest-telemetry.dto';
import { IngestSensorTelemetryDto } from './dto/ingest-sensor-telemetry.dto';
import { VehicleStatusCache } from '../common/cache/vehicle-status.cache';
import {
  isNotFuture,
  isPlausibleCoordinate,
  isPlausibleEngineTemperature,
  isPlausibleRpm,
  normalizeBatteryLevel,
} from './ingestion.validators';

@Injectable()
export class IngestionService {
  constructor(
    @InjectModel(TelemetryEvent.name) private telemetryModel: Model<TelemetryEventDocument>,
    private readonly vehicleStatusCache: VehicleStatusCache,
  ) {}

  async ingest(dto: IngestTelemetryDto) {
    if (!isPlausibleCoordinate(dto.lat, dto.lng)) {
      throw new BadRequestException('Coordinates out of range');
    }
    if (!isNotFuture(dto.recordedAt)) {
      throw new BadRequestException('recordedAt cannot be in the future');
    }
    const event = await this.telemetryModel.create({
      vehicleId: dto.vehicleId,
      recordedAt: new Date(dto.recordedAt),
      location: { lat: dto.lat, lng: dto.lng },
    });
    this.vehicleStatusCache.recordEvent(event.toObject());
    return event;
  }

  async ingestSensor(dto: IngestSensorTelemetryDto) {
    if (!isPlausibleCoordinate(dto.lat, dto.lng)) {
      throw new BadRequestException('Coordinates out of range');
    }
    if (!isNotFuture(dto.recordedAt)) {
      throw new BadRequestException('recordedAt cannot be in the future');
    }

    let batteryLevel: number | undefined;
    if (dto.batteryLevel !== undefined) {
      const normalized = normalizeBatteryLevel(dto.batteryLevel);
      if (normalized === null) {
        throw new BadRequestException('batteryLevel must be 0-100 (number or "87%")');
      }
      batteryLevel = normalized;
    }

    const diag = dto.engineDiagnostics;
    if (diag?.temperatureC !== undefined && !isPlausibleEngineTemperature(diag.temperatureC)) {
      throw new BadRequestException('engineDiagnostics.temperatureC out of range');
    }
    if (diag?.rpm !== undefined && !isPlausibleRpm(diag.rpm)) {
      throw new BadRequestException('engineDiagnostics.rpm out of range');
    }

    const event = await this.telemetryModel.create({
      vehicleId: dto.vehicleId,
      recordedAt: new Date(dto.recordedAt),
      location: { lat: dto.lat, lng: dto.lng },
      batteryLevel,
      engineDiagnostics: dto.engineDiagnostics,
    });
    this.vehicleStatusCache.recordEvent(event.toObject());
    return event;
  }
}
