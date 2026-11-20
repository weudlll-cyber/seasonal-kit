/**
 * @file   src/index.ts
 * @brief  Public entry point of @seasonal/kit for the browser: the theme logic and the game
 *         side of the website integration.
 *
 * Responsibility: name everything a game's browser code may import from the package root: the
 *                 theme, the website sign-in, the chat embed and its arrivals, and the call-view
 *                 slot with its messages. The CSS files and the early theme script are their own
 *                 exports; the Vite plugin is `@seasonal/kit/vite` (Node only, kept out of
 *                 browser bundles). ./frameMessages stays internal: games use the typed links.
 */
export { applyTheme, onShownThemeChange, onSystemThemeChange, resolveTheme, shownTheme, storedTheme, storeTheme, systemTheme, } from './theme.js';
export { signInAgain, signInAgainAfter, websiteLoginHref, websiteSignInHref, } from './websiteSignIn.js';
export { chatEmbedUrl, connectChat, } from './chatEmbed.js';
export { chatBarText, createChatArrivals, } from './chatArrivals.js';
export { connectCall, } from './callView.js';
export { CALL_SLOT, callSlot, } from './callSlot.js';
