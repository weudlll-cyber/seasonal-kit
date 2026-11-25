/**
 * @file   src/testing/containers.ts
 * @brief  Which of a game's containers lack the hardening every Seasonal game's carry (K89).
 *
 * Responsibility: `findWeakContainers(compose, options)` reads a Compose file as an object (what
 *                 `docker compose config --format json` prints, or the file parsed as YAML) and
 *                 returns one sentence per missing setting, an empty list when all are there. Every
 *                 service has a role the game's test names: an `app` or a `database` needs
 *                 `read_only: true`, `no-new-privileges`, `cap_drop: ALL`, is not privileged and
 *                 adds only the capabilities its role is shown to need (docs/OPERATIONS.md
 *                 "Container hardening"; a game names further ones per service); `unchecked` says
 *                 why a service is left out. A service without a role, and a role without a
 *                 service, are findings too, so a new service cannot slip past. Nothing is run.
 * Depends on:     nothing
 * Source:         new in the kit (K89): the app settings of seasonal-bingo-royale and
 *                 seasonal-mini-games ops/compose.yml (d7d841e, ae8fe40); the database's
 *                 capabilities measured on postgres:17-alpine (first start and restart, 2026-11-26).
 */
export type ContainerRole = 'app' | 'database' | { readonly unchecked: string };

export interface HardeningOptions {
  // Every service of the file, by name.
  readonly services: Readonly<Record<string, ContainerRole>>;
  // Capabilities a service needs beyond its role's, e.g. a proxy's NET_BIND_SERVICE.
  readonly capabilities?: Readonly<Record<string, readonly string[]>>;
}

// What a role may add back after dropping all. PostgreSQL's image gives its files to its own
// user and switches to it; without any of the four it does not start.
const ROLE_CAPABILITIES = {
  app: [],
  database: ['CHOWN', 'DAC_OVERRIDE', 'SETGID', 'SETUID'],
} as const satisfies Record<string, readonly string[]>;

type Fields = Readonly<Record<string, unknown>>;

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const words = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

// "cap_net_admin" and "NET_ADMIN" are the same capability.
const capability = (name: string): string => name.toUpperCase().replace(/^CAP_/, '');

// The sentences for one checked service.
function findingsOf(service: Fields, allowed: readonly string[]): string[] {
  const found: string[] = [];
  if (service['read_only'] !== true) found.push('read_only is not true');
  const options = words(service['security_opt']);
  if (!options.some((o) => /^no-new-privileges([:=]true)?$/.test(o))) {
    found.push('security_opt lacks no-new-privileges:true');
  }
  if (!words(service['cap_drop']).map(capability).includes('ALL')) {
    found.push('cap_drop lacks ALL');
  }
  const known = allowed.map(capability);
  for (const added of words(service['cap_add']).map(capability)) {
    if (!known.includes(added)) found.push(`cap_add ${added} is not one it is shown to need`);
  }
  if (service['privileged'] === true) found.push('privileged is true');
  return found;
}

export function findWeakContainers(compose: unknown, options: HardeningOptions): string[] {
  const services = isFields(compose) ? compose['services'] : undefined;
  if (!isFields(services)) throw new TypeError('Not a Compose file: it has no services');
  const found = Object.keys(options.services)
    .filter((name) => !Object.hasOwn(services, name))
    .map((name) => `${name}: the Compose file has no such service`);
  for (const [name, service] of Object.entries(services)) {
    const role = Object.hasOwn(options.services, name) ? options.services[name] : undefined;
    if (role === undefined) {
      found.push(`${name}: has no role in this check (app, database, or unchecked with why)`);
    } else if (typeof role === 'string') {
      const allowed = [...ROLE_CAPABILITIES[role], ...(options.capabilities?.[name] ?? [])];
      const fields = isFields(service) ? service : {};
      found.push(...findingsOf(fields, allowed).map((sentence) => `${name}: ${sentence}`));
    }
  }
  return found;
}
