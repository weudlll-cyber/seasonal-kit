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
export type ContainerRole = 'app' | 'database' | {
    readonly unchecked: string;
};
export interface HardeningOptions {
    readonly services: Readonly<Record<string, ContainerRole>>;
    readonly capabilities?: Readonly<Record<string, readonly string[]>>;
}
export declare function findWeakContainers(compose: unknown, options: HardeningOptions): string[];
