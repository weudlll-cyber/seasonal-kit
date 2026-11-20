/**
 * @file   src/websiteSignIn.ts
 * @brief  Website mode: start and finish sign-in through the website, and sign in again after
 *         the game session ended.
 *
 * Responsibility: `websiteSignInHref` is the game's sign-in route (`<base>auth/website`) with
 *                 the page shown now (path, query and hash) as `next`. If the website knows the
 *                 member, that route signs them in and brings them back to the page.
 *                 `websiteLoginHref` is the game's login hop (`<base>auth/website/login`): the
 *                 website's login form first, then the same way back. `signInAgain` goes to the
 *                 sign-in route when the game session ended under a signed-in page. It goes at
 *                 most once a minute per tab and sign-in route (sessionStorage), so a sign-in
 *                 that does not hold never loops. Without storage it does not go at all.
 *                 `signInAgainAfter` does the same for an API answer that carries the game's
 *                 session-ended header, whose value is the sign-in route. Every route must be a
 *                 path on this site. A header that names anything else is ignored, so no answer
 *                 can send the page to another host.
 * Source:         seasonal-mini-games packages/ui/src/websiteSignIn.ts at 91b23bc (the header
 *                 name and the storage key made the caller's and per route); the login hop from
 *                 seasonal-bingo-royale apps/web/src/account/WebsiteSignIn.tsx at c3b76c1.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2, docs/AUTH.md "Embedded
 *                 games" (at e7b995c)
 */
export declare function isLocalPath(path: string): boolean;
export declare function websiteSignInHref(signInPath: string, page?: string): string;
export declare function websiteLoginHref(signInPath: string, page?: string): string;
export declare function signInAgain(signInPath: string, go?: (href: string) => void): boolean;
export declare function signInAgainAfter(response: Pick<Response, 'headers'>, header: string, go?: (href: string) => void): boolean;
