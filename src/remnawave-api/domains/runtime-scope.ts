import { REMNAWAVE_OPERATION_INVENTORY } from '../generated/operation-inventory.js';
import type { RemnawaveOperationContract, RemnawaveSupportedOperationContract } from '../operation-contract.js';

const EXCLUDED_RUNTIME_DOMAINS = new Set([
  'auth',
  'connections',
  'ip_control',
  'node_plugins',
  'remnawave_settings',
  'tokens',
]);

export const SUPPORTED_REMNAWAVE_OPERATIONS = REMNAWAVE_OPERATION_INVENTORY.operations.filter(
  (operation) => operation.status === 'supported',
) as readonly RemnawaveSupportedOperationContract[];

export function isRuntimeSupportedOperation(key: string): boolean {
  return SUPPORTED_REMNAWAVE_OPERATIONS.some((operation) => operation.key === key && !EXCLUDED_RUNTIME_DOMAINS.has(operation.domain));
}

export function getRuntimeSupportedOperationKeys(): readonly string[] {
  return SUPPORTED_REMNAWAVE_OPERATIONS
    .filter((operation) => !EXCLUDED_RUNTIME_DOMAINS.has(operation.domain))
    .map((operation) => operation.key)
    .sort((left, right) => left.localeCompare(right));
}

export function isExcludedRuntimeSurface(operation: RemnawaveOperationContract): boolean {
  return EXCLUDED_RUNTIME_DOMAINS.has(operation.domain)
    || operation.openapi.path.startsWith('/api/auth')
    || operation.openapi.path.startsWith('/api/ip-control')
    || operation.openapi.path.startsWith('/api/connections')
    || operation.openapi.path.startsWith('/api/node-plugins')
    || operation.openapi.path === '/api/remnawave-settings'
    || operation.openapi.path === '/api/system/tools/happ/encrypt'
    || operation.openapi.path === '/api/system/testers/srr-matcher';
}
