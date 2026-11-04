import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class EngineDiagnosticsDto {
  @IsOptional()
  @IsNumber()
  temperatureC?: number;

  @IsOptional()
  @IsNumber()
  rpm?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  faultCodes?: string[];
}

export class IngestSensorTelemetryDto {
  @IsString()
  vehicleId: string;

  @IsDateString()
  recordedAt: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  batteryLevel?: number | string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EngineDiagnosticsDto)
  engineDiagnostics?: EngineDiagnosticsDto;
}
