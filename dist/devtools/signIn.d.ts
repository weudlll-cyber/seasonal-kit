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
    readonly accounts: Readonly<Record<string, DevAccount>>;
    readonly load?: RegExp;
}
export declare function devSignInAccount(body: unknown, rules: DevSignInRules): DevAccount | null;
