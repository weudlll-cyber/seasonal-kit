/**
 * @file   src/index.ts
 * @brief  Public entry point of @seasonal/kit for the browser: the theme logic and the game
 *         side of the website integration.
 *
 * Responsibility: name everything a game's browser code may import from the package root: the
 *                 theme, the website sign-in, the chat embed and its arrivals, the call-view slot
 *                 with its messages, `clockText`, `MIN_POINTER_TARGET` (24 px, WCAG 2.5.8, for a
 *                 game's own size tests), and the `FrameLink` and `FitGame` types (`FitGame`
 *                 names the `game` that StartCard, ResultFrame and useFitScale take).
 *                 The CSS files and the early theme script are their own exports; the Vite
 *                 plugin is `@seasonal/kit/vite` (Node only, kept out of browser bundles).
 *                 ./frameMessages stays internal: games use the typed links.
 * Source:         new in the kit (the entry point).
 */
export { applyTheme, onShownThemeChange, onSystemThemeChange, resolveTheme, shownTheme, storedTheme, storeTheme, systemTheme, type Theme, } from './theme.js';
export { signInAgain, signInAgainAfter, websiteLoginHref, websiteSignInHref, } from './websiteSignIn.js';
export { chatEmbedUrl, connectChat, type ChatLinkOptions, type EmbedTheme, type FromChat, type ToChat, } from './chatEmbed.js';
export { chatBarText, createChatArrivals, type ChatArrival, type ChatArrivals, type ChatArrivalsState, } from './chatArrivals.js';
export { connectCall, type CallLinkOptions, type CallStatus, type FromCall, type ToCall, } from './callView.js';
export { CALL_SLOT, callSlot, type CallSlot, type CallSlotForm, type CallSlotInput, } from './callSlot.js';
export { MIN_POINTER_TARGET, type FitGame, type FitOptions } from './fit.js';
export type { FrameLink } from './frameMessages.js';
export { clockText } from './clock.js';
