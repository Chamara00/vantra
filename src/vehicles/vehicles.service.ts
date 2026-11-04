import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema';
import { VehicleStatusCache } from '../common/cache/vehicle-status.cache';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectModel(Vehicle.name) private vehicleModel: Model<VehicleDocument>,
    private readonly vehicleStatusCache: VehicleStatusCache,
  ) {}

  findAll() {
    return this.vehicleModel.find().exec();
  }

  findByVehicleId(vehicleId: string) {
    return this.vehicleModel.findOne({ vehicleId }).exec();
  }

  async create(vehicleId: string, fleetName: string) {
    const vehicle = await this.vehicleModel.create({ vehicleId, fleetName });
    // The dashboard cache holds the vehicle list too.
    this.vehicleStatusCache.clear();
    return vehicle;
  }
}
