/**
 * @file   src/server/returnPath.ts
 * @brief  Where a visitor goes after signing in: a page under the game's base path, never
 *         another site; and the game's hop on to the website's login.
 *
 * Responsibility: `safeNext` keeps `next` only when it is a string of at most 512 printable
 *                 ASCII characters (the page's hash percent-encoded) under the base path, with
 *                 no "//" and no backslash anywhere, and no "." or ".." segment (also as "%2e")
 *                 and no encoded "/", "\" or NUL ("%2f", "%5c", "%00") in its path; anything else is the base path itself, the lobby. `websiteLoginLocation` is where `<base>auth/website/login` sends a
 *                 visitor: the website's login with the game's sign-in route and the checked
 *                 page as its return path. Each nested parameter is encoded on its own, so the
 *                 page is a parameter of the sign-in route, which is the login's parameter.
 * Source:         seasonal-mini-games apps/server/src/http/routes/websiteSignIn.ts (`safeNext`,
 *                 `toLogin`) at 866df03; seasonal-bingo-royale's is the same (a43209a). Added: the
 *                 base path must itself be a local path ending in "/".
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §2 "Required game login hop"
 */
const MAX_NEXT = 512;
// A "." or ".." segment, written plainly or percent-encoded ("%2e"): a browser resolves it, so
// "/games/bingo/../admin" would land outside the base path (review finding 4).
const DOT_SEGMENT = /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$|\?|#)/i;
// "/games/bingo/": one leading slash, a trailing one, no second slash in a row, no backslash,
// no dot segment; "/" alone is a game at the root.
function checkedBase(basePath) {
    if (!/^\/(?:[\w.~-]+\/)*$/.test(basePath) || DOT_SEGMENT.test(basePath)) {
        throw new TypeError(`Not a base path: ${basePath}`);
    }
    return basePath;
}
export function safeNext(next, basePath) {
    const base = checkedBase(basePath);
    if (typeof next !== 'string' || next.length > MAX_NEXT || !next.startsWith(base))
        return base;
    // The path part only: a query or hash may hold anything printable.
    const path = next.replace(/[?#][\s\S]*$/, '');
    const plain = /^[\x21-\x7e]+$/.test(next) && !/\/\/|\\/.test(next);
    // An encoded slash, backslash or NUL in the path: a proxy that decodes it could route the
    // request outside the base path (third review, finding 1).
    const encodedSeparator = /%(?:2f|5c|00)/i.test(path);
    return plain && !encodedSeparator && !DOT_SEGMENT.test(path) ? next : base;
}
// "/login?next=%2Fgames%2Fbingo%2Fauth%2Fwebsite%3Fnext%3D%252Fgames%252Fbingo%252F": the
// website's login path ends in its own `?next=`.
export function websiteLoginLocation(loginPath, basePath, next) {
    // The login is the website's, on this same site: never "//host" or a backslash.
    if (!/^\/(?![/\\])/.test(loginPath) || loginPath.includes('\\')) {
        throw new TypeError(`Not a path on this site: ${loginPath}`);
    }
    const base = checkedBase(basePath);
    const back = `${base}auth/website?next=${encodeURIComponent(safeNext(next, base))}`;
    return `${loginPath}${encodeURIComponent(back)}`;
}
