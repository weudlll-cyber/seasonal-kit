/**
 * @file   src/devtools/devtools.test.ts
 * @brief  The dev sign-in's request check, the dev-stub plugin, and the production-bundle scan.
 *
 * Responsibility: only the game's named accounts and its load pattern sign in, never an
 *                 inherited key, another type, a body that is no object, a name over 64
 *                 characters or one an unanchored pattern only partly matches; a g or y pattern
 *                 throws. The stub plugin sees relative and absolute imports, never a package
 *                 name, and replaces exactly those that resolve to a development module; a g or
 *                 y pattern throws. The scan finds every marker in every shipped file, skips
 *                 source maps, and finds the kit's own dev UI strings and the server marker
 *                 (independent review of v0.9.0, findings 7–10). Bingo's and Mini Games' devSignIn and
 *                 productionBundle tests (a43209a, 8de30b2) for the rules.
 * Depends on:     vitest, node:fs, node:os
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { devMarkersIn, devStubPlugin, KIT_DEV_MARKERS } from './bundle.js';
import { DEV_SIGN_IN_MARKER, devSignInAccount } from './signIn.js';

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

  it('takes a load name only when the whole name matches, and at most 64 characters', () => {
    const loose = { accounts: {}, load: /load-\d{3}/ };
    expect(devSignInAccount({ as: 'load-001' }, loose)).toEqual({
      displayName: 'dev-load-001',
      roles: [],
    });
    expect(devSignInAccount({ as: 'x<b>load-001</b>' }, loose)).toBeNull();
    const any = { accounts: {}, load: /^[a-z]+$/ };
    expect(devSignInAccount({ as: 'a'.repeat(64) }, any)).not.toBeNull();
    expect(devSignInAccount({ as: 'a'.repeat(65) }, any)).toBeNull();
  });

  it('refuses a load pattern with the g or y flag, its message the server marker', () => {
    for (const load of [/^load-\d{3}$/g, /load-\d{3}/y]) {
      expect(() => devSignInAccount({ as: 'load-001' }, { accounts: {}, load })).toThrow(
        DEV_SIGN_IN_MARKER,
      );
    }
    expect(KIT_DEV_MARKERS).toContain(DEV_SIGN_IN_MARKER);
  });
});

describe('the dev-stub plugin', () => {
  it('replaces exactly the local imports that resolve to a development module', () => {
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
    const seen = filter as unknown as RegExp;
    for (const local of ['./a.js', '../a.js', '/repo/a.js', 'C:\\repo\\a.js', 'c:/repo/a.js']) {
      expect(seen.test(local), local).toBe(true);
    }
    for (const bare of ['fastify', '@seasonal/kit/server', '#dev/signIn', 'node:fs']) {
      expect(seen.test(bare), bare).toBe(false);
    }
    const run = resolve as unknown as (args: { path: string; resolveDir: string }) => unknown;
    const stubbed = { path: '/repo/devStub.mjs' };
    expect(run({ path: './routes/devSignIn.js', resolveDir: '/repo/src' })).toEqual(stubbed);
    expect(run({ path: '../src/routes/devSignIn.js', resolveDir: '/repo/test' })).toEqual(stubbed);
    expect(run({ path: path.resolve('/repo/src/routes/devSignIn.js'), resolveDir: '/' })).toEqual(
      stubbed,
    );
    expect(run({ path: './routes/auth.js', resolveDir: '/repo/src' })).toBeUndefined();
  });

  it('refuses a dev-module pattern with the g or y flag', () => {
    expect(() => devStubPlugin(/devSignIn\.js$/g, '/stub.mjs')).toThrow(TypeError);
    expect(() => devStubPlugin(/devSignIn\.js$/y, '/stub.mjs')).toThrow(TypeError);
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
    writeFileSync(path.join(dir, 'server.mjs'), `throw new TypeError("${DEV_SIGN_IN_MARKER}")`);
    writeFileSync(path.join(dir, 'clean.js'), 'console.log(1)');
    const found = devMarkersIn(dir, ['/dev/sign-in', 'Quick Test', ...KIT_DEV_MARKERS]);
    expect(found.sort()).toEqual(
      [
        'index.js: /dev/sign-in',
        `server.mjs: ${DEV_SIGN_IN_MARKER}`,
        `${path.join('assets', 'ui.js')}: Dev sign-in`,
        `${path.join('assets', 'ui.js')}: dev-sign-in-`,
      ].sort(),
    );
  });
});
