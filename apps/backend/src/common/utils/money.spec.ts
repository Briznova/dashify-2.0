import { assertMoneyString } from './money';
describe('assertMoneyString', () => {
  it('accepts decimal strings', () => {
    expect(() => assertMoneyString('1200.50')).not.toThrow();
  });
  it('rejects floating-point notation and excess precision', () => {
    expect(() => assertMoneyString('1e3')).toThrow();
    expect(() => assertMoneyString('2.999')).toThrow();
  });
});
