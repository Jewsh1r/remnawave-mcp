import type { ResourceDefinition } from '../server/discovery.js';

export const RESOURCE_DEFINITIONS: readonly ResourceDefinition[] = [
  {
    kind: 'resource',
    uri: 'remnawave://panel/statistics',
    name: 'panel_statistics',
    title: 'Panel statistics',
    description: 'Stable read-only panel statistics resource for operator diagnostics and traffic interpretation.',
    mimeType: 'application/json',
  },
  {
    kind: 'resource',
    uri: 'remnawave://nodes/status',
    name: 'node_status',
    title: 'Node status',
    description: 'Stable read-only node status resource for node investigation and fleet diagnostics.',
    mimeType: 'application/json',
  },
  {
    kind: 'resource',
    uri: 'remnawave://system/health',
    name: 'health_checks',
    title: 'Health checks',
    description: 'Stable read-only health checks resource for operational diagnostics.',
    mimeType: 'application/json',
  },
] as const;
