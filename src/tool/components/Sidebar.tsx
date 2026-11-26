'use client';

import React from 'react';
import { MONOTONIC_NOTE, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="uuid-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Options</h3>
        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.uppercase}
            data-testid="option-uppercase"
            onChange={(e) => onChange({ ...state, uppercase: e.target.checked })}
          />
          Uppercase output
        </label>
        <label className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={state.hyphenless}
            data-testid="option-hyphenless"
            onChange={(e) => onChange({ ...state, hyphenless: e.target.checked })}
          />
          Hyphenless output
        </label>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Recent generations</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
        </p>
        <ul className="mt-2 space-y-1 font-mono text-[11px]" data-testid="sidebar-history-list">
          {state.history.map((entry) => (
            <li
              key={`${entry.text}-${entry.createdAt}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate text-gray-600 dark:text-gray-300">{entry.text}</span>
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(entry.text).catch(() => {})}
                className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label={`Copy ${entry.text}`}
              >
                Copy
              </button>
            </li>
          ))}
        </ul>
        {state.history.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({ ...state, history: [] })}
            data-testid="sidebar-clear-history"
            className="mt-2 text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Clear history
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
          Why v7 sorts correctly
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">{MONOTONIC_NOTE}</p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current state; open it to
          restore this tool state.
        </p>
      </div>
    </div>
  );
};
