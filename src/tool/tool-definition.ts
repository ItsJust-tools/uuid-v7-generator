import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_BATCH,
  MAX_HISTORY,
  MIN_BATCH,
  OUTPUT_FORMATS,
  clampBatchCount,
  historyText,
  summaryText,
  type HistoryEntry,
  type OutputFormat,
  type ToolState,
} from './types';

const VALID_FORMATS: OutputFormat[] = ['plain', 'json'];
const UUID_ITEM_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    generated: state.generated,
    batchCount: state.batchCount,
    outputFormat: state.outputFormat,
    uppercase: state.uppercase,
    hyphenless: state.hyphenless,
    decodeInput: state.decodeInput,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  const clamped = clampBatchCount(typeof value === 'number' ? value : Number.NaN);
  return clamped === null ? fallback : clamped;
}

function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

function validGenerated(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && UUID_ITEM_RE.test(item))
    .slice(0, MAX_BATCH);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected UUID v7 generator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const format: OutputFormat = VALID_FORMATS.includes(v.outputFormat as OutputFormat)
    ? (v.outputFormat as OutputFormat)
    : DEFAULT_STATE.outputFormat;
  const state: ToolState = {
    generated: validGenerated(v.generated),
    batchCount: numberOr(v.batchCount, DEFAULT_STATE.batchCount),
    outputFormat: format,
    uppercase: boolOr(v.uppercase, DEFAULT_STATE.uppercase),
    hyphenless: boolOr(v.hyphenless, DEFAULT_STATE.hyphenless),
    decodeInput: stringOr(v.decodeInput, DEFAULT_STATE.decodeInput),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

export const uuidV7GeneratorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export {
  DEFAULT_STATE,
  MAX_BATCH,
  MAX_HISTORY,
  MIN_BATCH,
  OUTPUT_FORMATS,
  historyText,
  summaryText,
};
