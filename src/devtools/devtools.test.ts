/**
 * @file   src/devtools/devtools.test.ts
 * @brief  The dev sign-in's request check, the dev-stub plugin, and the production-bundle scan.
 *
 * Responsibility: only the game's named accounts and its load pattern sign in, never an
 *                 inherited key, another type or a body that is no object. The stub plugin
 *                 replaces exactly the relative imports that resolve to a development module.
 *                 The scan finds every marker in every shipped file, skips source maps, and finds
 *                 the kit's own dev UI strings. Bingo's and Mini Games' devSignIn and
 *                 productionBundle tests (a43209a, 8de30b2) for the rules.
 * Depends on:     vitest, node:fs, node:os
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { devMarkersIn, devStubPlugin, KIT_DEV_MARKERS } from './bundle.js';
import { devSignInAccount } from './signIn.js';

const RULES = {
  accounts: {
    host: { displayName: 'dev-host', roles: ['organizer'] },
    'player-1': { displayName: 'dev-player-1', roles: [] },
  },
  load: /^load-\d{3}$/,
};

describe('the dev sign-in request', () => {
  it('names one of the game’s accounts, or a numbered load player', () => {
    expect(devSignInAccount({ as: 'host' }, RULES)).toEqual(RULES.accounts.host);
    expect(devSignInAccount({ as: 'load-007' }, RULES)).toEqual({
      displayName: 'dev-load-007',
      roles: [],
    });
  });

  it.each([
    ['an unknown name', { as: 'admin' }],
    ['an inherited key', { as: 'toString' }],
    ['__proto__', { as: '__proto__' }],
    ['a load name of the wrong length', { as: 'load-0007' }],
    ['a number', { as: 7 }],
    ['no `as`', {}],
    ['an array', ['host']],
    ['null', null],
    ['a string', 'host'],
  ])('refuses %s', (_what, body) => {
    expect(devSignInAccount(body, RULES)).toBeNull();
  });

  it('takes no load players when the game has no pattern', () => {
    expect(devSignInAccount({ as: 'load-001' }, { accounts: RULES.accounts })).toBeNull();
  });
});

describe('the dev-stub plugin', () => {
  it('replaces exactly the relative imports that resolve to a development module', () => {
    let resolve: ((args: { path: string; resolveDir: string }) => unknown) | null = null;
    let filter: RegExp | null = null;
    const plugin = devStubPlugin(/[\\/]src[\\/]routes[\\/]devSignIn\.js$/, '/repo/devStub.mjs');
    plugin.setup({
      onResolve(options, callback) {
        filter = options.filter;
        resolve = callback;
      },
    });
    expect(plugin.name).toBe('seasonal-dev-stub');
    expect(filter).toEqual(/^\./);
    const run = resolve as unknown as (args: { path: string; resolveDir: string }) => unknown;
    expect(run({ path: './routes/devSignIn.js', resolveDir: '/repo/src' })).toEqual({
      path: '/repo/devStub.mjs',
    });
    expect(run({ path: './routes/auth.js', resolveDir: '/repo/src' })).toBeUndefined();
  });
});

describe('the production-bundle scan', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'kit-bundle-'));
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('finds every marker in every shipped file, source maps aside', () => {
    mkdirSync(path.join(dir, 'assets'));
    writeFileSync(path.join(dir, 'index.js'), 'fetch("/dev/sign-in")');
    writeFileSync(
      path.join(dir, 'assets', 'ui.js'),
      '"Dev sign-in" data-testid="dev-sign-in-host"',
    );
    writeFileSync(path.join(dir, 'assets', 'ui.js.map'), '"Quick Test" "Dev sign-in"');
    writeFileSync(path.join(dir, 'clean.js'), 'console.log(1)');
    const found = devMarkersIn(dir, ['/dev/sign-in', 'Quick Test', ...KIT_DEV_MARKERS]);
    expect(found.sort()).toEqual(
      [
        'index.js: /dev/sign-in',
        `${path.join('assets', 'ui.js')}: Dev sign-in`,
        `${path.join('assets', 'ui.js')}: dev-sign-in-`,
      ].sort(),
    );
  });
});
