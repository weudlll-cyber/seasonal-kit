/**
 * @file   src/testing/containers.test.ts
 * @brief  The container check passes a hardened file and names each missing setting (K89).
 *
 * Responsibility: a file like the one docs/OPERATIONS.md shows passes; each setting taken away, a
 *                 capability nothing shows a need for, a privileged container, a service without a
 *                 role and a role without a service are each named; an unchecked service and a
 *                 capability the game names pass; anything that is no Compose file throws.
 * Depends on:     vitest
 * Source:         new in the kit.
 */
import { describe, expect, it } from 'vitest';

import { findWeakContainers, type HardeningOptions } from './containers.js';

const hard = {
  read_only: true,
  security_opt: ['no-new-privileges:true'],
  cap_drop: ['ALL'],
};
const file = (app: object = hard, postgres: object = {}) => ({
  services: {
    app,
    postgres: { ...hard, cap_add: ['CHOWN', 'DAC_OVERRIDE', 'SETGID', 'SETUID'], ...postgres },
  },
});
const options: HardeningOptions = { services: { app: 'app', postgres: 'database' } };
const without = (key: keyof typeof hard) =>
  Object.fromEntries(Object.entries(hard).filter(([name]) => name !== key));

describe('findWeakContainers', () => {
  it('finds nothing in a hardened file', () => {
    expect(findWeakContainers(file(), options)).toEqual([]);
  });

  it.each([
    ['read_only', without('read_only'), 'app: read_only is not true'],
    [
      'no-new-privileges',
      without('security_opt'),
      'app: security_opt lacks no-new-privileges:true',
    ],
    ['cap_drop', without('cap_drop'), 'app: cap_drop lacks ALL'],
    ['a partial drop', { ...hard, cap_drop: ['NET_RAW'] }, 'app: cap_drop lacks ALL'],
    [
      'a switched-off option',
      { ...hard, security_opt: ['no-new-privileges:false'] },
      'app: security_opt lacks no-new-privileges:true',
    ],
    ['a privileged container', { ...hard, privileged: true }, 'app: privileged is true'],
    [
      'a capability an app has no need of',
      { ...hard, cap_add: ['cap_chown'] },
      'app: cap_add CHOWN is not one it is shown to need',
    ],
  ])('names a missing %s', (_name, app, sentence) => {
    expect(findWeakContainers(file(app), options)).toEqual([sentence]);
  });

  it('gives the database only its four capabilities', () => {
    const found = findWeakContainers(file(hard, { cap_add: ['SYS_ADMIN', 'CHOWN'] }), options);
    expect(found).toEqual(['postgres: cap_add SYS_ADMIN is not one it is shown to need']);
  });

  it('names every setting of a bare service', () => {
    expect(findWeakContainers(file(null as unknown as object), options)).toHaveLength(3);
  });
});

describe('the services of the file', () => {
  it('lets a game name a capability, and leave a service out with its reason', () => {
    const compose = {
      services: { ...file().services, proxy: { ...hard, cap_add: ['NET_BIND_SERVICE'] }, t: {} },
    };
    expect(
      findWeakContainers(compose, {
        services: { ...options.services, proxy: 'app', t: { unchecked: 'a throw-away tool' } },
        capabilities: { proxy: ['NET_BIND_SERVICE'] },
      }),
    ).toEqual([]);
  });

  it('names a service without a role and a role without a service', () => {
    const compose = { services: { app: hard, extra: hard } };
    expect(findWeakContainers(compose, options)).toEqual([
      'postgres: the Compose file has no such service',
      'extra: has no role in this check (app, database, or unchecked with why)',
    ]);
  });

  it.each([null, 'services:', [], {}, { services: [] }])('refuses %j', (compose) => {
    expect(() => findWeakContainers(compose, options)).toThrow(TypeError);
  });
});
