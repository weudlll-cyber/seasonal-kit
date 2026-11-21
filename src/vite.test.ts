/**
 * @file   src/vite.test.ts
 * @brief  The theme-init plugin serves the early script at the base path and writes it into a
 *         build beside index.html.
 *
 * Responsibility: `themeInit()` driven through the hooks Vite calls: configResolved (the base),
 *                 configureServer (development: the file under the base, everything else passed
 *                 on) and generateBundle (a build: one unhashed asset `theme-init.js`).
 * Source:         new in the kit.
 */
import { readFileSync } from 'node:fs';

import type { ResolvedConfig, ViteDevServer } from 'vite';
import { describe, expect, it, vi } from 'vitest';

import { themeInit } from './vite.js';

const EARLY = readFileSync(new URL('../browser/theme-init.js', import.meta.url), 'utf8');

type Handler = (req: { url?: string }, res: unknown, next: () => void) => void;

// A plugin hook as Vite holds it: the function itself or { handler }.
function hook(h: unknown): (...args: unknown[]) => unknown {
  const fn = typeof h === 'function' ? h : (h as { handler: unknown }).handler;
  return fn as (...args: unknown[]) => unknown;
}

// The plugin configured for `base`, with its development middleware.
function served(base: string): Handler {
  const plugin = themeInit();
  hook(plugin.configResolved).call(null, { base } as ResolvedConfig);
  let handler: Handler | undefined;
  const server = { middlewares: { use: (h: Handler) => (handler = h) } };
  hook(plugin.configureServer).call(null, server as unknown as ViteDevServer);
  if (!handler) throw new Error('no middleware');
  return handler;
}

describe('themeInit in development', () => {
  it('answers <base>theme-init.js, with or without a query, as JavaScript', () => {
    const handler = served('/games/mini-games/');
    for (const url of ['/games/mini-games/theme-init.js', '/games/mini-games/theme-init.js?v=1']) {
      const res = { setHeader: vi.fn(), end: vi.fn() };
      const next = vi.fn();
      handler({ url }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/javascript; charset=utf-8');
      expect(res.end).toHaveBeenCalledWith(EARLY);
    }
  });

  it('passes every other request on, the file outside the base too', () => {
    const handler = served('/games/mini-games/');
    for (const url of ['/theme-init.js', '/games/mini-games/main.ts', undefined]) {
      const next = vi.fn();
      handler(url === undefined ? {} : { url }, {}, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });
});

describe('themeInit in a build', () => {
  it('writes the early script as theme-init.js, unhashed', () => {
    const plugin = themeInit();
    const emitFile = vi.fn();
    hook(plugin.generateBundle).call({ emitFile });
    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: 'theme-init.js',
      source: EARLY,
    });
  });
});
