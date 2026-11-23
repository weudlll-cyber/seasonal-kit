/**
 * @file   src/react/index.ts
 * @brief  The `@seasonal/kit/react` entry: the screen building blocks over the kit's
 *         framework-free core.
 *
 * Responsibility: name everything a game's React code may import: the theme hooks and toggle,
 *                 the disclosure hook, the fit hook, the back link, the docked chat with the
 *                 website's chat frame, the hook a game's own chat room reports arrivals with,
 *                 the frames a game fills (the start card and the result), and the round's
 *                 focus mode: the game bar, its panels, full screen and the phase strip; and the
 *                 shared app header (K21). The development sign-in is its own entry
 *                 (`@seasonal/kit/react/dev`, ./dev), so a production bundle never holds it. React
 *                 is an optional peer dependency, so games without React never load
 *                 this entry (SECURITY.md).
 * Source:         new in the kit.
 */
export { AppHeader, } from './AppHeader.js';
export { BackLink } from './BackLink.js';
export { ChatDock } from './ChatDock.js';
export { DockedScreen } from './DockedScreen.js';
export { useDockArrivals, useDockView } from './dockSight.js';
export { GameBar, } from './GameBar.js';
export { PhaseStrip } from './PhaseStrip.js';
export { useFocusMode } from './useFocusMode.js';
export { useFullscreen } from './useFullscreen.js';
export { usePanels } from './usePanels.js';
export { ResultFrame } from './ResultFrame.js';
export { StartCard } from './StartCard.js';
export { ThemeToggle, useShownTheme, useTheme } from './theme.js';
export { useDisclosure } from './useDisclosure.js';
export { useDockReserve } from './useDockReserve.js';
export { useFitScale } from './useFitScale.js';
export { OriginChatFrame, WebsiteChatFrame, } from './WebsiteChatFrame.js';
