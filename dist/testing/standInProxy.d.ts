/**
 * @file   src/testing/standInProxy.ts
 * @brief  The proxy half of the stand-in website: a game's pages under `/games/<slug>/`, the
 *         identity only on the sign-in route.
 *
 * Responsibility: forwards every request (and WebSocket upgrade) under a game's path to its app,
 *                 as the game's route file does: the identity headers and the proxy secret a
 *                 client sends are removed on every path and the website's session cookie never
 *                 reaches the app; only `<base>/auth/website` asks the website's authorize first,
 *                 passes its identity headers on and then adds the game's secret, and a refusal
 *                 goes to `<base>/auth/website/login` with the same query; `<base>/metrics` is 404.
 * Depends on:     node:http, ./standInContract
 * Source:         seasonal-mini-games ops/lib/website-route.sh at 9e3c6f3 and its
 *                 e2e/websiteStub.ts; seasonal-bingo-royale e2e/websiteStack.ts at 8d20904 (K74).
 * Spec:           website docs/GAME-INTEGRATION.md §2 "Required trust checks" at cc743b9
 */
import { type IncomingHttpHeaders, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import type { AuthorizeAnswer } from './standInContract.js';
export interface StandInGame {
    readonly app: string;
    readonly secretHeader: string;
    readonly secret: string;
}
export interface ProxyTarget {
    readonly game: StandInGame;
    readonly base: string;
}
export declare function appHeaders(request: IncomingMessage, target: ProxyTarget, ask: () => AuthorizeAnswer): IncomingHttpHeaders | {
    readonly redirect: string;
};
export declare function forward(request: IncomingMessage, response: ServerResponse, app: string, headers: IncomingHttpHeaders): void;
export declare function forwardUpgrade(request: IncomingMessage, socket: Duplex, app: string, headers: IncomingHttpHeaders): void;
