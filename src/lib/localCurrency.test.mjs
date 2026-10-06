import { describe, it, expect } from 'vitest';
import { convertText, currencyForTimeZone, formatAmount } from './localCurrency.mjs';

describe('localCurrency', () => {
  it('시간대로 통화를 고른다', () => {
    expect(currencyForTimeZone('Asia/Singapore')).toBe('SGD');
    expect(currencyForTimeZone('Asia/Hong_Kong')).toBe('HKD');
    expect(currencyForTimeZone('Asia/Kuala_Lumpur')).toBe('MYR');
    expect(currencyForTimeZone('America/New_York')).toBeNull();
  });
  it('금액 반올림', () => {
    expect(formatAmount(2.925)).toBe('2.9');
    expect(formatAmount(70.2)).toBe('70');
    expect(formatAmount(1234.6)).toBe('1,235');
  });
  it('(about $N) 을 바꾼다', () => {
    expect(convertText('₩12,000 (about $9) each', 'SGD')).toBe('₩12,000 (about S$12) each');
    expect(convertText('₩12,000 (about $9)', 'HKD')).toBe('₩12,000 (about HK$70)');
    expect(convertText('₩30,000 (about $22.50)', 'MYR')).toBe('₩30,000 (about RM97)');
  });
  it('million 표기도 바꾼다', () => {
    expect(convertText('₩10.6 billion (about $8 million)', 'SGD')).toBe('₩10.6 billion (about S$10.4 million)');
  });
  it('통화가 없으면 그대로 둔다', () => {
    expect(convertText('₩12,000 (about $9)', null)).toBe('₩12,000 (about $9)');
    expect(convertText('roughly $5 to $8', 'SGD')).toBe('roughly $5 to $8');
  });
});
