import { describe, expect, it } from 'vitest';
import { formatKm, haversineKm } from '../distanceCalculator';

describe('haversineKm', () => {
  it('är noll för samma punkt', () => {
    expect(haversineKm(57.78, 14.16, 57.78, 14.16)).toBe(0);
  });
  it('ger ett rimligt avstånd Jönköping–Värnamo (ca 66 km fågelväg)', () => {
    const km = haversineKm(57.7826, 14.1618, 57.186, 14.04);
    expect(km).toBeGreaterThan(64);
    expect(km).toBeLessThan(68);
  });
  it('är symmetrisk', () => {
    expect(haversineKm(57.1, 14, 58, 15)).toBeCloseTo(haversineKm(58, 15, 57.1, 14), 10);
  });
  it('formaterar på svenska', () => {
    expect(formatKm(1.34)).toBe('1,3 km');
    expect(formatKm(42.6)).toBe('43 km');
  });
});
