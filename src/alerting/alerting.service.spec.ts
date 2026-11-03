import { AlertingService } from './alerting.service';

describe('AlertingService debounce', () => {
  let service: AlertingService;
  let alertModel: any;
  let telemetryModel: any;

  beforeEach(() => {
    alertModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    telemetryModel = {
      distinct: jest.fn(),
      findOne: jest.fn(),
    };
    service = new AlertingService(alertModel, telemetryModel);
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
