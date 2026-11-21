/**
 * @file   src/devtools/signIn.ts
 * @brief  The development quick sign-in's request, checked: which of the game's dev accounts
 *         a click names.
 *
 * Responsibility: `devSignInAccount` reads a POST body `{ as }` and answers the game's account
 *                 for it: one of the game's named accounts (Bingo: host and three players; Mini
 *                 Games: those and admin), or a numbered load-check player (`load-001` …, the
 *                 game's own pattern, named `dev-<as>`). Anything else is null, and the route
 *                 answers 400. The route itself stays the game's: it is registered only with the
 *                 game's dev switch, and its module is replaced by a stub in the production
 *                 bundle (./bundle, `devStubPlugin`), which the bundle test proves
 *                 (`devMarkersIn`). Framework-agnostic: no Fastify, no zod.
 * Source:         seasonal-bingo-royale apps/server/src/http/routes/devSignIn.ts at a43209a;
 *                 seasonal-mini-games apps/server/src/http/routes/devSignIn.ts at 8de30b2 (the
 *                 admin account, 3–4 digit load names).
 * Spec:           kit docs/ADOPTION.md "Dev tools"
 */

export interface DevAccount {
  readonly displayName: string;
  readonly roles: readonly string[];
}

export interface DevSignInRules {
  // The game's named accounts by the `as` its buttons send, e.g. `host`, `player-1`, `admin`.
  readonly accounts: Readonly<Record<string, DevAccount>>;
  // The load check's numbered players, e.g. /^load-\d{3}$/; none when absent.
  readonly load?: RegExp;
}

export function devSignInAccount(body: unknown, rules: DevSignInRules): DevAccount | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const as = (body as Record<string, unknown>)['as'];
  if (typeof as !== 'string') return null;
  // Own keys only: "toString" or "__proto__" never name an account.
  const named = Object.hasOwn(rules.accounts, as) ? rules.accounts[as] : undefined;
  if (named !== undefined) return named;
  if (rules.load?.test(as) === true) return { displayName: `dev-${as}`, roles: [] };
  return null;
}
