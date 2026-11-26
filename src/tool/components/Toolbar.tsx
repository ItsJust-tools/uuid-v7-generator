'use client';

import React from 'react';
import { MAX_BATCH, MIN_BATCH, clampBatchCount, uuidV7, type ToolState } from '../types';

interface ToolbarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
  onClear: () => void;
  onCopy?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ state, onChange, onClear, onCopy }) => {
  const [countText, setCountText] = React.useState(String(state.batchCount));
  const [countError, setCountError] = React.useState(false);

  const handleGenerate = React.useCallback(() => {
    const parsed = Number.parseInt(countText, 10);
    const clamped = Number.isFinite(parsed) ? clampBatchCount(parsed) : null;
    if (clamped === null) {
      setCountError(true);
      return;
    }
    setCountError(false);
    const generated: string[] = [];
    for (let i = 0; i < clamped; i++) {
      generated.push(uuidV7());
    }
    onChange({ ...state, generated, batchCount: clamped });
  }, [countText, onChange, state]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2" role="group" aria-label="UUID v7 generator controls">
        <label className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
          Count
          <input
            type="number"
            min={MIN_BATCH}
            max={MAX_BATCH}
            value={countText}
            data-testid="batch-count-input"
            onChange={(e) => {
              setCountText(e.target.value);
              setCountError(false);
            }}
            className="w-20 rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          />
        </label>
        {countError ? (
          <span className="text-xs text-red-600 dark:text-red-400" data-testid="count-error">
            Enter 1–{MAX_BATCH}
          </span>
        ) : null}
        <button
          type="button"
          onClick={handleGenerate}
          data-testid="btn-generate"
          className="rounded-md bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
        >
          Generate
        </button>
        <button
          type="button"
          onClick={onClear}
          data-testid="btn-clear"
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Clear
        </button>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            data-testid="btn-copy-result"
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Copy output
          </button>
        ) : null}
      </div>
    </div>
  );
};
