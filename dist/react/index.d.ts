/**
 * @file   src/react/index.ts
 * @brief  The `@seasonal/kit/react` entry: the screen building blocks over the kit's
 *         framework-free core.
 *
 * Responsibility: name everything a game's React code may import: the theme hooks and toggle,
 *                 the disclosure hook, the fit hook, the back link, the docked chat with the
 *                 website's chat frame, and the hook a game's own chat room reports arrivals
 *                 with. React is an optional peer dependency, so games without React never load
 *                 this entry (SECURITY.md).
 */
export { BackLink } from './BackLink.js';
export { ChatDock, type ChatDockProps } from './ChatDock.js';
export { DockedScreen, type DockedScreenProps } from './DockedScreen.js';
export { useDockArrivals, useDockView, type DockView } from './dockSight.js';
export { ThemeToggle, useShownTheme, useTheme } from './theme.js';
export { useDisclosure, type Disclosure } from './useDisclosure.js';
export { useFitScale } from './useFitScale.js';
export { WebsiteChatFrame, type WebsiteChatFrameProps } from './WebsiteChatFrame.js';
