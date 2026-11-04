export function isPlausibleCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isNotFuture(dateIso: string, toleranceMs = 60_000): boolean {
  return new Date(dateIso).getTime() <= Date.now() + toleranceMs;
}

export function normalizeBatteryLevel(value: unknown): number | null {
  let level: number;
  if (typeof value === 'number') {
    level = value;
  } else if (typeof value === 'string' && /^\s*\d+(\.\d+)?\s*%?\s*$/.test(value)) {
    level = parseFloat(value);
  } else {
    return null;
  }
  return Number.isFinite(level) && level >= 0 && level <= 100 ? level : null;
}

export function isPlausibleEngineTemperature(celsius: number): boolean {
  return celsius >= -50 && celsius <= 200;
}

export function isPlausibleRpm(rpm: number): boolean {
  return rpm >= 0 && rpm <= 10_000;
}
