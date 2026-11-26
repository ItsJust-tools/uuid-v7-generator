'use client';

import React from 'react';
import {
  OUTPUT_FORMATS,
  decodeUuidV7,
  formatBatch,
  formatUuid,
  isUuidString,
  bitBreakdown,
  type ToolState,
} from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const latest = (state: ToolState): string | null =>
  state.generated.length > 0 ? (state.generated[state.generated.length - 1] ?? null) : null;

export const Canvas: React.FC<CanvasProps> = ({ state, onChange }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const latestUuid = latest(state);
  const decoded = isUuidString(state.decodeInput) ? decodeUuidV7(state.decodeInput) : null;
  const decodeInvalid = state.decodeInput.trim().length > 0 && decoded === null;
  const batchOutput = formatBatch(
    state.generated,
    state.outputFormat,
    state.uppercase,
    state.hyphenless
  );

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="uuid-canvas">
      <div
        className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
        data-testid="uuid-result-card"
        role="status"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Latest UUID v7
        </span>
        <span className="flex items-center justify-center gap-2">
          <span className="block font-mono text-lg font-bold break-all" data-testid="uuid-latest">
            {latestUuid ? formatUuid(latestUuid, state.uppercase, state.hyphenless) : '—'}
          </span>
          {latestUuid ? (
            <CopyButton
              value={formatUuid(latestUuid, state.uppercase, state.hyphenless)}
              testid="copy-latest-uuid"
            />
          ) : null}
        </span>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Decode a UUID v7
          <input
            type="text"
            value={state.decodeInput}
            onChange={(e) => update({ decodeInput: e.target.value })}
            data-testid="decode-input"
            placeholder="018f3a2b-7c1d-7xxx-xxxx-xxxxxxxxxxxx"
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        {decodeInvalid ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" data-testid="decode-error">
            Not a valid UUID v7 string.
          </p>
        ) : null}
        {decoded ? (
          <div
            className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-800 dark:bg-gray-900"
            data-testid="decode-panel"
          >
            <div className="flex items-center justify-between gap-2">
              <span>
                Timestamp: {decoded.timestampMs} ms — {decoded.isoDate}
              </span>
              <CopyButton value={decoded.isoDate} testid="copy-decode-timestamp" />
            </div>
            <ul className="mt-2 font-mono" data-testid="decode-bits">
              {bitBreakdown(decoded).map((row) => (
                <li key={row.label} className="flex justify-between gap-2">
                  <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
                  <span>{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2" data-testid="format-selector">
          {OUTPUT_FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              aria-pressed={state.outputFormat === format.value}
              data-testid={`format-${format.value}`}
              title={format.hint}
              onClick={() => update({ outputFormat: format.value })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                state.outputFormat === format.value
                  ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
              }`}
            >
              {format.label}
            </button>
          ))}
        </div>
        <textarea
          readOnly
          value={batchOutput}
          data-testid="batch-output"
          rows={Math.min(12, Math.max(4, state.generated.length + 1))}
          className="mt-2 w-full rounded-md border border-gray-300 bg-white p-3 font-mono text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        {state.generated.length > 0 ? (
          <div className="mt-1 flex items-center gap-2">
            <CopyButton value={batchOutput} testid="copy-batch" />
            <button
              type="button"
              onClick={() => update({ generated: [] })}
              data-testid="clear-batch"
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Clear
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
