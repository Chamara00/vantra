import { normalizeBatteryLevel } from './ingestion.validators';

describe('normalizeBatteryLevel', () => {
  it('keeps numeric values from newer firmware', () => {
    expect(normalizeBatteryLevel(64.5)).toBe(64.5);
  });

  it('converts percentage strings from older data (VANTRA-512)', () => {
    expect(normalizeBatteryLevel('87%')).toBe(87);
    expect(normalizeBatteryLevel('87')).toBe(87);
  });

  it('accepts the 0 and 100 boundaries', () => {
    expect(normalizeBatteryLevel(0)).toBe(0);
    expect(normalizeBatteryLevel('100%')).toBe(100);
  });

  it('rejects out-of-range values', () => {
    expect(normalizeBatteryLevel(150)).toBeNull();
    expect(normalizeBatteryLevel(-5)).toBeNull();
    expect(normalizeBatteryLevel('-5%')).toBeNull();
  });

  it('rejects values that are not a number or percentage', () => {
    expect(normalizeBatteryLevel('abc')).toBeNull();
    expect(normalizeBatteryLevel('')).toBeNull();
    expect(normalizeBatteryLevel(null)).toBeNull();
    expect(normalizeBatteryLevel(NaN)).toBeNull();
  });
});
