/**
 * @file   src/react/index.ts
 * @brief  The `@seasonal/kit/react` entry: the screen building blocks over the kit's
 *         framework-free core.
 *
 * Responsibility: name everything a game's React code may import: the theme hooks and toggle,
 *                 the disclosure hook, the fit hook, the back link, the docked chat with the
 *                 website's chat frame, the hook a game's own chat room reports arrivals with,
 *                 and the frames a game fills: the start card and the result. React is an optional peer dependency, so games without React never load
 *                 this entry (SECURITY.md).
 */
export { BackLink } from './BackLink.js';
export { ChatDock } from './ChatDock.js';
export { DockedScreen } from './DockedScreen.js';
export { useDockArrivals, useDockView } from './dockSight.js';
export { ResultFrame } from './ResultFrame.js';
export { StartCard } from './StartCard.js';
export { ThemeToggle, useShownTheme, useTheme } from './theme.js';
export { useDisclosure } from './useDisclosure.js';
export { useFitScale } from './useFitScale.js';
export { WebsiteChatFrame } from './WebsiteChatFrame.js';
