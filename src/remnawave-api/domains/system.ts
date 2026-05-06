import type { OperationRegistry, RemnawaveApiClient, RuntimeOperationFactoryContext } from '../registry.js';

const SYSTEM_READ_OPERATIONS = [
  {
    operation: 'get_stats',
    description: 'Return normalized panel statistics.',
    helpText: 'Send payload {} to read current system stats.',
    notes: 'Generated OpenAPI-backed system statistics read.',
    legacyToolName: 'system_get_stats',
    clientMethod: 'getSystemStats',
  },
  {
    operation: 'get_metadata',
    description: 'Return system metadata.',
    helpText: 'Send payload {} to read system metadata.',
    notes: 'Generated OpenAPI-backed system metadata read.',
    legacyToolName: 'system_get_metadata',
    clientMethod: 'getMetadata',
  },
  {
    operation: 'get_health',
    description: 'Return current Remnawave health diagnostics.',
    helpText: 'Send payload {} to read current system health.',
    notes: 'Generated OpenAPI-backed system health read.',
    legacyToolName: 'system_get_health',
    clientMethod: 'getSystemHealth',
  },
  {
    operation: 'get_bandwidth_stats',
    description: 'Return aggregate bandwidth statistics.',
    helpText: 'Send payload {} to read aggregate bandwidth statistics.',
    notes: 'Generated OpenAPI-backed bandwidth statistics read.',
    legacyToolName: 'system_get_bandwidth_stats',
    clientMethod: 'getBandwidthStats',
  },
  {
    operation: 'get_node_statistics',
    description: 'Return aggregate node statistics.',
    helpText: 'Send payload {} to read aggregate node statistics.',
    notes: 'Generated OpenAPI-backed node statistics read.',
    legacyToolName: 'system_get_node_statistics',
    clientMethod: 'getNodesStatistics',
  },
  {
    operation: 'get_nodes_metrics',
    description: 'Return node metrics diagnostics.',
    helpText: 'Send payload {} to read node metrics.',
    notes: 'Generated OpenAPI-backed node metrics read.',
    legacyToolName: 'system_get_nodes_metrics',
    clientMethod: 'getNodesMetrics',
  },
  {
    operation: 'get_recap',
    description: 'Return system recap statistics.',
    helpText: 'Send payload {} to read system recap statistics.',
    notes: 'Generated OpenAPI-backed system recap read.',
    legacyToolName: 'system_get_recap',
    clientMethod: 'getSystemRecap',
  },
] as const;

export function registerSystemOperations(
  registry: OperationRegistry,
  context: RuntimeOperationFactoryContext,
): void {
  for (const definition of SYSTEM_READ_OPERATIONS) {
    registry.register('system', definition.operation, context.supportedReadOperation(
      'system',
      definition.operation,
      definition.description,
      definition.helpText,
      definition.notes,
      definition.legacyToolName,
      definition.clientMethod,
      async (client) => {
        const read = context.requireClientMethod(
          client,
          definition.clientMethod as keyof RemnawaveApiClient,
          `system.${definition.operation}`,
        ) as () => Promise<unknown>;
        return { result: await read() };
      },
    ));
  }
}
