import { LatestReading, VehicleStatusCache, VehicleStatusSnapshot } from './vehicle-status.cache';

const reading = (vehicleId: string, recordedAt: string): LatestReading => ({
  vehicleId,
  recordedAt: new Date(recordedAt),
});

const snapshotWith = (...readings: LatestReading[]): VehicleStatusSnapshot => ({
  vehicles: [],
  latestByVehicleId: new Map(readings.map((r) => [r.vehicleId, r])),
});

describe('VehicleStatusCache', () => {
  let cache: VehicleStatusCache;

  beforeEach(() => {
    cache = new VehicleStatusCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('loads once and serves later reads from memory', async () => {
    const load = jest.fn().mockResolvedValue(snapshotWith());
    await cache.get(load);
    await cache.get(load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shares one load between concurrent requests on a cold cache', async () => {
    const load = jest.fn().mockResolvedValue(snapshotWith());
    await Promise.all([cache.get(load), cache.get(load), cache.get(load)]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('updates a vehicle when newer telemetry arrives', async () => {
    await cache.get(async () => snapshotWith(reading('v1', '2026-11-04T10:00:00Z')));
    cache.recordEvent(reading('v1', '2026-11-04T11:00:00Z'));
    const { latestByVehicleId } = await cache.get(jest.fn());
    expect(latestByVehicleId.get('v1')!.recordedAt.toISOString()).toBe('2026-11-04T11:00:00.000Z');
  });

  it('ignores out-of-order telemetry older than the cached reading', async () => {
    await cache.get(async () => snapshotWith(reading('v1', '2026-11-04T10:00:00Z')));
    cache.recordEvent(reading('v1', '2026-11-04T09:00:00Z'));
    const { latestByVehicleId } = await cache.get(jest.fn());
    expect(latestByVehicleId.get('v1')!.recordedAt.toISOString()).toBe('2026-11-04T10:00:00.000Z');
  });

  it('keeps telemetry that arrives while a load is in flight', async () => {
    let finishLoad!: (s: VehicleStatusSnapshot) => void;
    const pending = cache.get(() => new Promise((resolve) => (finishLoad = resolve)));
    cache.recordEvent(reading('v1', '2026-11-04T11:00:00Z'));
    finishLoad(snapshotWith(reading('v1', '2026-11-04T10:00:00Z')));
    const { latestByVehicleId } = await pending;
    expect(latestByVehicleId.get('v1')!.recordedAt.toISOString()).toBe('2026-11-04T11:00:00.000Z');
  });

  it('reloads after clear()', async () => {
    const load = jest.fn().mockResolvedValue(snapshotWith());
    await cache.get(load);
    cache.clear();
    await cache.get(load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not keep a load that finished after clear()', async () => {
    let finishLoad!: (s: VehicleStatusSnapshot) => void;
    const stale = cache.get(() => new Promise((resolve) => (finishLoad = resolve)));
    cache.clear();
    finishLoad(snapshotWith());
    await stale;
    const load = jest.fn().mockResolvedValue(snapshotWith());
    await cache.get(load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads after the TTL expires', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(0);
    const load = jest.fn().mockResolvedValue(snapshotWith());
    await cache.get(load);
    now.mockReturnValue(5 * 60 * 1000 + 1);
    await cache.get(load);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
