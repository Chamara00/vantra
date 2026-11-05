import { AlertingService } from './alerting.service';

describe('AlertingService debounce', () => {
  let service: AlertingService;
  let alertModel: any;
  let fleetStatusClient: any;

  beforeEach(() => {
    alertModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    fleetStatusClient = {
      getLastSeen: jest.fn(),
    };
    service = new AlertingService(alertModel, fleetStatusClient);
  });

  it('does not raise a duplicate while an active alert already exists', async () => {
    alertModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'existing' }) });
    const staleSince = new Date(Date.now() - 20 * 60 * 1000);
    const result = await service.checkVehicleOffline('v1', staleSince);
    expect(result).toBeNull();
    expect(alertModel.create).not.toHaveBeenCalled();
  });

    it('suppresses repeat alerts for a flapping vehicle within the debounce window (VANTRA-441)', async () => {
    alertModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ _id: 'recent' }) });
    const staleSince = new Date(Date.now() - 20 * 60 * 1000);
    const result = await service.checkVehicleOffline('v1', staleSince);
    expect(result).toBeNull();
  });

    it('raises a fresh alert once the previous one has been resolved', async () => {
    alertModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    alertModel.create.mockResolvedValue({ _id: 'new-alert' });
    const staleSince = new Date(Date.now() - 20 * 60 * 1000);
    const result = await service.checkVehicleOffline('v1', staleSince);
    expect(result).toEqual({ _id: 'new-alert' });
  });

  it('only treats unresolved alerts as blocking (regression from 3775723)', async () => {
    alertModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    alertModel.create.mockResolvedValue({ _id: 'new-alert' });
    const staleSince = new Date(Date.now() - 20 * 60 * 1000);
    await service.checkVehicleOffline('v1', staleSince);
    const query = alertModel.findOne.mock.calls[0][0];
    expect(query).toEqual(expect.objectContaining({ resolvedAt: null }));
    expect(query.createdAt).toBeUndefined();
  });
});

describe('AlertingService offline sweep', () => {
  let service: AlertingService;
  let fleetStatusClient: any;

  beforeEach(() => {
    fleetStatusClient = { getLastSeen: jest.fn() };
    service = new AlertingService({} as any, fleetStatusClient);
  });

  it('checks every vehicle that has a last-seen time', async () => {
    const lastSeenAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    fleetStatusClient.getLastSeen.mockResolvedValue([
      { vehicleId: 'v1', lastSeenAt },
      { vehicleId: 'v2', lastSeenAt: null },
    ]);
    const check = jest.spyOn(service, 'checkVehicleOffline').mockResolvedValue(null);
    await service.sweepFleetForOffline();
    expect(check).toHaveBeenCalledTimes(1);
    expect(check).toHaveBeenCalledWith('v1', new Date(lastSeenAt));
  });

  it('skips the sweep without throwing when the monolith is unreachable', async () => {
    fleetStatusClient.getLastSeen.mockRejectedValue(new Error('fetch failed'));
    const check = jest.spyOn(service, 'checkVehicleOffline');
    await expect(service.sweepFleetForOffline()).resolves.toBeUndefined();
    expect(check).not.toHaveBeenCalled();
  });
});
