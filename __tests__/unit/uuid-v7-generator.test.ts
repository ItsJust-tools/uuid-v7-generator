import { describe, it, expect } from 'vitest';
import {
  uuidV7,
  decodeUuidV7,
  formatUuid,
  formatBatch,
  clampBatchCount,
  normalizeUuid,
  isUuidString,
  bitBreakdown,
  summaryText,
  DEFAULT_STATE,
  MAX_BATCH,
  MIN_BATCH,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  withHistory,
  roundTrips,
  uuidV7GeneratorTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

const V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('uuidV7', () => {
  it('produces RFC v7 pattern (version nibble 7, RFC variant)', () => {
    for (let i = 0; i < 200; i++) {
      expect(uuidV7()).toMatch(V7_RE);
    }
  });

  it('encodes the given timestamp in the top 48 bits', () => {
    const ts = 1700000000000;
    const decoded = decodeUuidV7(uuidV7(ts));
    expect(decoded?.timestampMs).toBe(ts);
  });

  it('is lexicographically order-consistent with creation time', () => {
    const earlier = uuidV7(1700000000000);
    const later = uuidV7(1700000000001);
    expect(later > earlier).toBe(true);
  });

  it('clamps extreme timestamps to the 48-bit range', () => {
    const huge = decodeUuidV7(uuidV7(Number.MAX_SAFE_INTEGER));
    expect(huge?.timestampMs).toBe(0xffffffffffff);
    const negative = decodeUuidV7(uuidV7(-5));
    expect(negative?.timestampMs).toBe(0);
  });

  it('generates unique values', () => {
    const set = new Set(Array.from({ length: 500 }, () => uuidV7()));
    expect(set.size).toBe(500);
  });
});

describe('decodeUuidV7', () => {
  it('extracts the correct millisecond timestamp from a known UUID v7', () => {
    const known = '018f6a2c-7abc-7def-8abc-123456789abc';
    const decoded = decodeUuidV7(known);
    expect(decoded?.timestampMs).toBe(0x018f6a2c7abc);
    expect(decoded?.version).toBe(7);
  });

  it('returns ISO date matching the timestamp', () => {
    const ts = 1700000000000;
    const decoded = decodeUuidV7(uuidV7(ts));
    expect(decoded?.isoDate).toBe(new Date(ts).toISOString());
  });

  it('rejects invalid strings', () => {
    expect(decodeUuidV7('')).toBeNull();
    expect(decodeUuidV7('not-a-uuid')).toBeNull();
    expect(decodeUuidV7('zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz')).toBeNull();
    expect(decodeUuidV7('018f6a2c-7abc-7def-8abc-123456789ab')).toBeNull();
  });

  it('rejects non-v7 versions and non-RFC variants', () => {
    // version 4 UUID
    expect(decodeUuidV7('3d2f1e0a-9b8c-4d1e-a2f3-0b4c5d6e7f80')).toBeNull();
    // v7 version nibble but wrong variant (00)
    expect(decodeUuidV7('018f6a2c-7abc-7def-0abc-123456789abc')).toBeNull();
    // wrong variant (11)
    expect(decodeUuidV7('018f6a2c-7abc-7def-cabc-123456789abc')).toBeNull();
  });

  it('accepts uppercase and hyphenless input via normalization', () => {
    const u = uuidV7();
    const compact = u.replace(/-/g, '').toUpperCase();
    expect(decodeUuidV7(compact)?.uuid).toBe(u);
  });
});

describe('bitBreakdown', () => {
  it('labels the v7 bit fields', () => {
    const decoded = decodeUuidV7('018f6a2c-7abc-7def-8abc-123456789abc');
    if (!decoded) throw new Error('expected decode');
    const rows = bitBreakdown(decoded);
    expect(rows.map((r) => r.label)).toEqual([
      'Unix ms (48 bits)',
      'Version nibble',
      'Random (12 bits)',
      'Variant bits',
      'Random (62 bits)',
    ]);
    const concatenated = rows.map((r) => r.value).join('');
    expect(concatenated.length).toBe(32);
  });
});

describe('clampBatchCount', () => {
  it('clamps into the 1..1000 range', () => {
    expect(clampBatchCount(0)).toBe(MIN_BATCH);
    expect(clampBatchCount(-50)).toBe(MIN_BATCH);
    expect(clampBatchCount(1)).toBe(1);
    expect(clampBatchCount(500)).toBe(500);
    expect(clampBatchCount(1000)).toBe(MAX_BATCH);
    expect(clampBatchCount(1001)).toBe(MAX_BATCH);
    expect(clampBatchCount(2.7)).toBe(2);
    expect(clampBatchCount(Number.NaN)).toBeNull();
    expect(clampBatchCount(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('formatting', () => {
  const u = '018f6a2c-7abc-7def-8abc-123456789abc';

  it('formats uppercase', () => {
    expect(formatUuid(u, true, false)).toBe(u.toUpperCase());
  });

  it('formats hyphenless', () => {
    expect(formatUuid(u, false, true)).toBe(u.replace(/-/g, ''));
  });

  it('formats uppercase and hyphenless combined', () => {
    expect(formatUuid(u, true, true)).toBe(u.replace(/-/g, '').toUpperCase());
  });

  it('joins plain batches one per line', () => {
    expect(formatBatch([u, u], 'plain', false, false)).toBe(`${u}\n${u}`);
  });

  it('produces a JSON array', () => {
    expect(formatBatch([u, u], 'json', false, false)).toBe(JSON.stringify([u, u], null, 2));
    const parsed: unknown = JSON.parse(formatBatch([u], 'json', false, false));
    expect(parsed).toEqual([u]);
  });
});

describe('normalize and detect', () => {
  it('normalizes case and stray separators', () => {
    const u = uuidV7().toUpperCase();
    expect(normalizeUuid(u.replace(/-/g, ' '))).toBe(u.toLowerCase());
  });

  it('detects valid UUID strings', () => {
    expect(isUuidString('018f6a2c-7abc-7def-8abc-123456789abc')).toBe(true);
    expect(isUuidString('hello')).toBe(false);
    expect(isUuidString('')).toBe(false);
  });
});

describe('tool state serialization', () => {
  it('round-trips a full state', () => {
    const s = state({
      generated: [uuidV7(), uuidV7()],
      batchCount: 42,
      outputFormat: 'json',
      uppercase: true,
      hyphenless: true,
      decodeInput: uuidV7(),
      history: [{ text: 'u', createdAt: '2026-11-26T10:00:00.000Z' }],
    });
    expect(roundTrips(s)).toBe(true);
  });

  it('repairs invalid payloads into a valid state', () => {
    const r1 = deserializeState(null);
    expect(r1.success).toBe(false);
    const r2 = deserializeState('nope');
    expect(r2.success).toBe(false);
    const r3 = deserializeState({ generated: ['bad'], batchCount: 9999, outputFormat: 'weird' });
    expect(r3.success).toBe(true);
    if (r3.success) {
      expect(r3.data.generated).toEqual([]);
      expect(r3.data.batchCount).toBe(1000);
      expect(r3.data.outputFormat).toBe(DEFAULT_STATE.outputFormat);
    }
  });

  it('drops invalid generated entries and caps at MAX_BATCH', () => {
    const generated = Array.from({ length: 1200 }, () => uuidV7());
    generated[5] = 'bogus';
    const result = deserializeState({ generated, batchCount: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.generated).toHaveLength(1000);
      expect(result.data.generated).not.toContain('bogus');
    }
  });

  it('caps history at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < 25; i++) {
      s = withHistory(s, `u${i}`, new Date(`2026-01-01T00:00:${String(i % 60).padStart(2, '0')}Z`));
    }
    expect(s.history).toHaveLength(20);
    expect(s.history[0]?.text).toBe('u24');
  });

  it('includes generated flag in serialization format', () => {
    const s = state({ batchCount: 3 });
    expect(serializeState(s)).toContain('"batchCount":3');
  });

  it('exposes the tool with correct identity and exporters', () => {
    expect(uuidV7GeneratorTool.id).toBe('uuid-v7-generator');
    expect(uuidV7GeneratorTool.serialize).toBe(serializeState);
    expect(uuidV7GeneratorTool.deserialize === deserializeState).toBe(true);
    expect(uuidV7GeneratorTool.exporters).toHaveLength(4);
  });
});

describe('summaryText', () => {
  it('summarizes empty and populated states', () => {
    expect(summaryText(state())).toContain('no UUIDs');
    const u = uuidV7();
    expect(summaryText(state({ generated: [u] }))).toContain(u.slice(0, 8));
    expect(summaryText(state({ generated: [uuidV7(), u] }))).toContain('2 UUIDs');
  });
});
