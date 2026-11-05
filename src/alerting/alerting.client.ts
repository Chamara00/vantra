import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export type Alert = {
  _id: string;
  vehicleId: string;
  type: string;
  message: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const TIMEOUT_MS = 3_000;

// HTTP client for the standalone alerting service. Replaces the old
// in-process AlertingService.
@Injectable()
export class AlertingClient {
  private readonly baseUrl = process.env.ALERTING_SERVICE_URL || 'http://localhost:3001';

  findActiveForVehicle(vehicleId: string): Promise<Alert[]> {
    return this.request(`/alerts?vehicleId=${encodeURIComponent(vehicleId)}`);
  }

  resolve(alertId: string): Promise<Alert> {
    return this.request(`/alerts/${encodeURIComponent(alertId)}/resolve`, 'POST');
  }

  private async request<T>(path: string, method = 'GET'): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'x-internal-api-key': process.env.INTERNAL_API_KEY ?? '' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException('Alerting service unavailable');
    }
    if (!res.ok) {
      throw new BadGatewayException(`Alerting service returned ${res.status}`);
    }
    return (await res.json()) as T;
  }
}
