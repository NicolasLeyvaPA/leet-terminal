/**
 * Market Type Detection Tests
 *
 * Ensures binary vs categorical markets are correctly identified.
 */

import { describe, it, expect } from 'vitest';
import {
  detectMarketType,
  isCategoricalMarket,
  getTopOutcomes,
  NormalizedOutcome,
  MarketSummary,
} from '../index.js';

describe('detectMarketType', () => {
  it('should detect Yes/No as BINARY', () => {
    const outcomes: NormalizedOutcome[] = [
      { id: '1', label: 'Yes', type: 'YES', probability: 0.6 },
      { id: '2', label: 'No', type: 'NO', probability: 0.4 },
    ];
    expect(detectMarketType(outcomes)).toBe('BINARY');
  });

  it('should detect True/False as BINARY', () => {
    const outcomes: NormalizedOutcome[] = [
      { id: '1', label: 'True', type: 'YES', probability: 0.7 },
      { id: '2', label: 'False', type: 'NO', probability: 0.3 },
    ];
    expect(detectMarketType(outcomes)).toBe('BINARY');
  });

  it('should detect two non-yes/no outcomes as CATEGORICAL', () => {
    const outcomes: NormalizedOutcome[] = [
      { id: '1', label: 'Team A', type: 'OPTION', probability: 0.6 },
      { id: '2', label: 'Team B', type: 'OPTION', probability: 0.4 },
    ];
    expect(detectMarketType(outcomes)).toBe('CATEGORICAL');
  });

  it('should detect multiple outcomes as CATEGORICAL', () => {
    const outcomes: NormalizedOutcome[] = [
      { id: '1', label: 'Kansas City Chiefs', type: 'OPTION', probability: 0.25 },
      { id: '2', label: 'San Francisco 49ers', type: 'OPTION', probability: 0.2 },
      { id: '3', label: 'Buffalo Bills', type: 'OPTION', probability: 0.15 },
      { id: '4', label: 'Philadelphia Eagles', type: 'OPTION', probability: 0.1 },
      { id: '5', label: 'Other', type: 'OPTION', probability: 0.3 },
    ];
    expect(detectMarketType(outcomes)).toBe('CATEGORICAL');
  });

  it('should handle single outcome as BINARY (edge case)', () => {
    const outcomes: NormalizedOutcome[] = [
      { id: '1', label: 'Yes', type: 'YES', probability: 1.0 },
    ];
    expect(detectMarketType(outcomes)).toBe('BINARY');
  });
});

describe('isCategoricalMarket', () => {
  it('should return true for CATEGORICAL markets', () => {
    const market = {
      market_type: 'CATEGORICAL',
      normalized_outcomes: [
        { id: '1', label: 'A', type: 'OPTION', probability: 0.5 },
        { id: '2', label: 'B', type: 'OPTION', probability: 0.3 },
        { id: '3', label: 'C', type: 'OPTION', probability: 0.2 },
      ],
    } as MarketSummary;
    expect(isCategoricalMarket(market)).toBe(true);
  });

  it('should return false for BINARY markets', () => {
    const market = {
      market_type: 'BINARY',
      normalized_outcomes: [
        { id: '1', label: 'Yes', type: 'YES', probability: 0.6 },
        { id: '2', label: 'No', type: 'NO', probability: 0.4 },
      ],
    } as MarketSummary;
    expect(isCategoricalMarket(market)).toBe(false);
  });
});

describe('getTopOutcomes', () => {
  it('should return top outcomes sorted by probability', () => {
    const market = {
      market_type: 'CATEGORICAL',
      normalized_outcomes: [
        { id: '3', label: 'Third', type: 'OPTION', probability: 0.15 },
        { id: '1', label: 'First', type: 'OPTION', probability: 0.5 },
        { id: '2', label: 'Second', type: 'OPTION', probability: 0.25 },
        { id: '4', label: 'Fourth', type: 'OPTION', probability: 0.1 },
      ],
    } as MarketSummary;

    const top = getTopOutcomes(market, 3);
    expect(top).toHaveLength(3);
    expect(top[0].label).toBe('First');
    expect(top[1].label).toBe('Second');
    expect(top[2].label).toBe('Third');
  });

  it('should return all outcomes if n > outcomes.length', () => {
    const market = {
      market_type: 'BINARY',
      normalized_outcomes: [
        { id: '1', label: 'Yes', type: 'YES', probability: 0.6 },
        { id: '2', label: 'No', type: 'NO', probability: 0.4 },
      ],
    } as MarketSummary;

    const top = getTopOutcomes(market, 10);
    expect(top).toHaveLength(2);
  });
});
