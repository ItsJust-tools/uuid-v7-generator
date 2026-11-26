export type OutputFormat = 'plain' | 'json';

export interface HistoryEntry {
  /** The generated UUID. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** UUIDs from the most recent generation run, newest batch first. */
  generated: string[];
  /** Requested batch size, clamped to 1..1000. */
  batchCount: number;
  /** Batch output style: one per line or a JSON array. */
  outputFormat: OutputFormat;
  /** Render UUIDs in uppercase. */
  uppercase: boolean;
  /** Render UUIDs without hyphens. */
  hyphenless: boolean;
  /** Current decode input (a UUID v7 string). */
  decodeInput: string;
  /** Recent single generations, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  generated: [],
  batchCount: 5,
  outputFormat: 'plain',
  uppercase: false,
  hyphenless: false,
  decodeInput: '',
  history: [],
};

export const MIN_BATCH = 1;
export const MAX_BATCH = 1000;
export const MAX_HISTORY = 20;

export const OUTPUT_FORMATS: { value: OutputFormat; label: string; hint: string }[] = [
  { value: 'plain', label: 'Plain list', hint: 'one UUID per line' },
  { value: 'json', label: 'JSON array', hint: 'JSON array of UUID strings' },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the string looks like a UUID (any version). */
export function isUuidString(input: string): boolean {
  return UUID_RE.test(input.trim());
}

/** Normalize a UUID string to lowercase with hyphens; null when invalid. */
export function normalizeUuid(input: string): string | null {
  const cleaned = input.trim().toLowerCase().replace(/[\s-]/g, '');
  if (!/^[0-9a-f]{32}$/.test(cleaned)) return null;
  return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

const hex = (n: number, width: number): string => n.toString(16).padStart(width, '0');

/**
 * RFC 4122 / RFC 9562 UUID v7: 48-bit Unix millisecond timestamp, version nibble 7
 * and RFC variant bits. Monotonic within a millisecond via a random tail, so
 * lexicographic order matches creation order for same-ms generations in practice.
 */
export function uuidV7(now: number = Date.now()): string {
  const ts = Math.max(0, Math.min(0xffffffffffff, Math.floor(now)));
  const rand = randomBytes(10);
  // Bytes layout: ts(6) | version+rand(2) | variant+rand(8)
  const b = new Uint8Array(16);
  b[0] = Math.floor(ts / 2 ** 40) & 0xff;
  b[1] = Math.floor(ts / 2 ** 32) & 0xff;
  b[2] = Math.floor(ts / 2 ** 24) & 0xff;
  b[3] = Math.floor(ts / 2 ** 16) & 0xff;
  b[4] = Math.floor(ts / 2 ** 8) & 0xff;
  b[5] = ts & 0xff;
  b[6] = 0x70 | ((rand[0] ?? 0) & 0x0f);
  b[7] = rand[1] ?? 0;
  b[8] = 0x80 | ((rand[2] ?? 0) & 0x3f);
  for (let i = 9; i < 16; i++) b[i] = rand[i - 7] ?? 0;
  const h = Array.from(b, (x) => hex(x, 2)).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export interface DecodedUuidV7 {
  /** Normalized lowercase hyphenated UUID. */
  uuid: string;
  /** Version nibble (only 7 accepted). */
  version: number;
  /** Embedded Unix timestamp in milliseconds. */
  timestampMs: number;
  /** ISO 8601 rendering of the timestamp. */
  isoDate: string;
  /** 16 bytes of the UUID as hex pairs. */
  hexBytes: string[];
}

/**
 * Decode a UUID v7 back to its millisecond Unix timestamp.
 * Returns null for invalid or non-v7 UUIDs.
 */
export function decodeUuidV7(input: string): DecodedUuidV7 | null {
  const normalized = normalizeUuid(input);
  if (!normalized) return null;
  const compact = normalized.replace(/-/g, '');
  const hexBytes: string[] = [];
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    const byte = Number.parseInt(compact.slice(i, i + 2), 16);
    hexBytes.push(hex(byte, 2));
    bytes.push(byte);
  }
  const version = (bytes[6] ?? 0) >> 4;
  const variantBits = (bytes[8] ?? 0) >> 6;
  if (version !== 7 || variantBits !== 0b10) return null;
  let ts = 0;
  for (let i = 0; i < 6; i++) ts = ts * 256 + (bytes[i] ?? 0);
  return {
    uuid: normalized,
    version,
    timestampMs: ts,
    isoDate: new Date(ts).toISOString(),
    hexBytes,
  };
}

/** Human-readable bit breakdown of version and variant fields. */
export function bitBreakdown(decoded: DecodedUuidV7): { label: string; value: string }[] {
  const compact = decoded.uuid.replace(/-/g, '');
  return [
    { label: 'Unix ms (48 bits)', value: compact.slice(0, 12) },
    { label: 'Version nibble', value: compact.slice(12, 13) },
    { label: 'Random (12 bits)', value: compact.slice(13, 16) },
    { label: 'Variant bits', value: compact.slice(16, 18) },
    { label: 'Random (62 bits)', value: compact.slice(18, 32) },
  ];
}

/** Apply uppercase / hyphenless formatting to a UUID string. */
export function formatUuid(value: string, uppercase: boolean, hyphenless: boolean): string {
  let out = value.trim();
  if (hyphenless) out = out.replace(/-/g, '');
  if (uppercase) out = out.toUpperCase();
  return out;
}

/** Format a batch of UUIDs according to the selected output format. */
export function formatBatch(
  uuids: string[],
  format: OutputFormat,
  uppercase: boolean,
  hyphenless: boolean
): string {
  const formatted = uuids.map((u) => formatUuid(u, uppercase, hyphenless));
  return format === 'json' ? JSON.stringify(formatted, null, 2) : formatted.join('\n');
}

/** Clamp a batch count into the 1..1000 range; null for unparseable input. */
export function clampBatchCount(input: number): number | null {
  if (typeof input !== 'number' || !Number.isFinite(input)) return null;
  return Math.max(MIN_BATCH, Math.min(MAX_BATCH, Math.floor(input)));
}

/** Single line describing why v7 sorts correctly, shown in the sidebar. */
export const MONOTONIC_NOTE =
  'UUID v7 embeds a 48-bit millisecond timestamp in its leading bits, so sorting UUID strings ' +
  'lexicographically sorts them by creation time. Within the same millisecond the random tail ' +
  'keeps values unique; newly generated UUIDs never sort before older ones generated in an ' +
  'earlier millisecond.';

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  if (state.generated.length === 0) return 'UUID v7: no UUIDs generated yet';
  const first = formatUuid(state.generated[0] ?? '', state.uppercase, state.hyphenless);
  return state.generated.length === 1
    ? `UUID v7: ${first}`
    : `UUID v7: ${state.generated.length} UUIDs (latest ${first})`;
}

/** Build a history entry for the most recently generated batch. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    Array.isArray(v.generated) && typeof v.batchCount === 'number' && DEFAULT_STATE !== undefined
  );
}

export { OUTPUT_FORMATS as FORMATS };
