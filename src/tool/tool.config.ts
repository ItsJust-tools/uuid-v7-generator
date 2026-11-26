import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'uuid-v7-generator',
  name: 'UUID v7 Generator',
  description:
    'Generate and inspect UUID v7 (time-ordered) identifiers with timestamp decoding, bulk generation and multiple output formats.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    accentSubtle: 'rgba(124, 58, 237, 0.08)',
    brand: 'UUID v7 Generator',
    icon: '⏱',
  },
} satisfies ToolConfig;

export default toolConfig;
