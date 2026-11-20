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
// The key's prefix; the sign-in route follows it, so each game keeps its own guard.
const LAST_KEY = 'sk.signInAgainAt:';
const AT_MOST_EVERY_MS = 60_000;
// A path on this site: one leading slash, then no second one, and no backslash anywhere
// (browsers read both as the start of another host).
export function isLocalPath(path) {
    return /^\/(?!\/)/.test(path) && !path.includes('\\');
}
function localPath(path) {
    if (!isLocalPath(path))
        throw new TypeError(`Not a path on this site: ${path}`);
    return path;
}
// The page shown now, as the game's return path.
function currentPage() {
    const { pathname, search, hash } = window.location;
    return `${pathname}${search}${hash}`;
}
// "/games/mini-games/auth/website?next=%2Fgames%2Fmini-games%2F%23%2Fmatch%2FX"
export function websiteSignInHref(signInPath, page = currentPage()) {
    return `${localPath(signInPath)}?next=${encodeURIComponent(page)}`;
}
// "/games/bingo/auth/website/login?next=…": the website's login, then the sign-in route.
export function websiteLoginHref(signInPath, page = currentPage()) {
    return `${localPath(signInPath)}/login?next=${encodeURIComponent(page)}`;
}
function lastTry(key) {
    try {
        return Number(window.sessionStorage.getItem(key) ?? 0);
    }
    catch {
        return 0;
    }
}
// True when the page is on its way to the sign-in route; false when it went there less than a
// minute ago (the caller then handles the answer as it is). `go` leaves the page.
export function signInAgain(signInPath, go = (href) => {
    window.location.assign(href);
}) {
    const href = websiteSignInHref(signInPath);
    const key = `${LAST_KEY}${signInPath}`;
    const now = Date.now();
    if (now - lastTry(key) < AT_MOST_EVERY_MS)
        return false;
    try {
        window.sessionStorage.setItem(key, String(now));
    }
    catch {
        // Without storage there is no loop guard, so no automatic sign-in either.
        return false;
    }
    go(href);
    return true;
}
// An API answer: true when its `header` (the game's, e.g. `x-smg-session-ended`) names the
// sign-in route and the page is on its way there; the caller then lets its call never settle.
export function signInAgainAfter(response, header, go) {
    const signInPath = response.headers.get(header);
    return signInPath !== null && isLocalPath(signInPath) && signInAgain(signInPath, go);
}
