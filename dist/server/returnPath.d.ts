/**
 * @file   src/server/returnPath.ts
 * @brief  Where a visitor goes after signing in: a page under the game's base path, never
 *         another site; and the game's hop on to the website's login.
 *
 * Responsibility: `safeNext` keeps `next` only when it is a string of at most 512 printable
 *                 ASCII characters (the page's hash percent-encoded) under the base path, with
 *                 no "//" and no backslash anywhere, and no "." or ".." segment (also as "%2e")
 *                 and no encoded "/", "\" or NUL ("%2f", "%5c", "%00") in its path; anything else
 *                 is the base path itself, the lobby. `websiteLoginLocation` is where
 *                 `<base>auth/website/login` sends a visitor: the website's login with the
 *                 game's sign-in route and the checked page as its return path. Each nested parameter is encoded on its own, so the
 *                 page is a parameter of the sign-in route, which is the login's parameter.
 * Source:         seasonal-mini-games apps/server/src/http/routes/websiteSignIn.ts (`safeNext`,
 *                 `toLogin`) at 866df03; seasonal-bingo-royale's is the same (a43209a). Added: the
 *                 base path must itself be a local path ending in "/".
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2 "Required game login hop"
 */
export declare function safeNext(next: unknown, basePath: string): string;
export declare function websiteLoginLocation(loginPath: string, basePath: string, next: unknown): string;
