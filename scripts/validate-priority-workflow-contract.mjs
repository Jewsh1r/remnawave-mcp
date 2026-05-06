import { readFileSync } from 'node:fs';

const contractPath = new URL('../docs/contracts/priority-workflow-contract.md', import.meta.url);
const contract = readFileSync(contractPath, 'utf8');

const requiredSections = [
  '## Workflow A — New node/server/host onboarding',
  '## Workflow B — Full topology reconfiguration',
  '## Workflow C — Routing / server-routing / response-rule change',
  '## Workflow D — External squad onboarding / white-label partner setup',
  '## Workflow E — Template delivery control / advanced Xray JSON',
];

const requiredInScope = [
  'New node/server/host onboarding on the Remnawave side',
  'Full node/profile/host configuration needed for production use',
  'Routing, server-routing, and response-rule reconfiguration for real transport chains',
  'Internal and external squad management for access-control and white-label onboarding',
  'Node and host ordering where it affects subscription output',
  'Subscription delivery template management with emphasis on advanced Xray JSON',
];

const requiredOutOfScope = [
  'Mass user actions and most bulk-user administration',
  'Passwords, passkeys, admin login settings, and general auth-hardening flows',
  'BotFather/domain-binding, webhook infra setup/signing, security hardening, upgrade flows, rescue CLI',
];

const requiredEvidenceRefs = [
  'task8.nodes.create-edit-lifecycle',
  'task8.hosts.advanced-options',
  'task8.config-profiles.assignment-activation-downstream',
  'task8.server-routing.bridge-setup',
  'task8.response-rules.create-ordering',
  'task7.external-squads.lifecycle-overrides',
  'task8.templates.delivery-control',
];

const errors = [];

for (const section of requiredSections) {
  if (!contract.includes(section)) {
    errors.push(`Missing required workflow section: ${section}`);
  }
}

for (const item of requiredInScope) {
  if (!contract.includes(item)) {
    errors.push(`Missing in-scope workflow item: ${item}`);
  }
}

for (const item of requiredOutOfScope) {
  if (!contract.includes(item)) {
    errors.push(`Missing out-of-scope item: ${item}`);
  }
}

for (const ref of requiredEvidenceRefs) {
  if (!contract.includes(ref)) {
    errors.push(`Missing required evidence reference: ${ref}`);
  }
}

if (!contract.includes('Current gap map')) {
  errors.push('Contract must include explicit gap maps.');
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

console.log('OK: priority workflow contract is complete and scope-locked.');
