import type { OperationRegistry, RuntimeOperationFactoryContext } from '../registry.js';
import { registerHostOperations } from './hosts.js';
import { registerMetadataOperations } from './metadata.js';
import { registerNodeOperations } from './nodes.js';
import { getRuntimeSupportedOperationKeys } from './runtime-scope.js';
import { registerProfileOperations } from './profiles.js';
import { registerPublicSubscriptionOperations } from './public-subscriptions.js';
import { registerSnippetOperations } from './snippets.js';
import { registerSquadOperations } from './squads.js';
import { registerSubscriptionOperations } from './subscriptions.js';
import { registerSystemOperations } from './system.js';
import { registerTemplateOperations } from './templates.js';
import { registerUserOperations } from './users.js';

export function registerRuntimeDomainOperations(
  registry: OperationRegistry,
  context: RuntimeOperationFactoryContext,
): void {
  registerSystemOperations(registry, context);
  registerUserOperations(registry, context);
  registerHostOperations(registry, context);
  registerNodeOperations(registry, context);
  registerMetadataOperations(registry, context);
  registerTemplateOperations(registry, context);
  registerSnippetOperations(registry, context);
  registerPublicSubscriptionOperations(registry, context);
  registerSubscriptionOperations(registry, context);
  registerProfileOperations(registry, context);
  registerSquadOperations(registry, context);
  context.registerGeneratedInventoryOperations(registry, registry.getScopeMap().supported);
  assertInventoryBackedRuntimeCoverage(registry);
}

function assertInventoryBackedRuntimeCoverage(registry: OperationRegistry): void {
  const expected = getRuntimeSupportedOperationKeys();
  const actual = [...registry.getScopeMap().supported].sort((left, right) => left.localeCompare(right));

  if (actual.length !== expected.length || actual.some((operation, index) => operation !== expected[index])) {
    throw new Error(`Runtime operation overlays do not match generated supported inventory: ${actual.join(', ')}`);
  }
}
