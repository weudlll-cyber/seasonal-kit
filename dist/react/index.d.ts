/**
 * @file   src/react/index.ts
 * @brief  The `@seasonal/kit/react` entry: the screen building blocks over the kit's
 *         framework-free core.
 *
 * Responsibility: name everything a game's React code may import: the theme hooks and toggle,
 *                 the disclosure hook, the fit hook, the back link, the docked chat with the
 *                 website's chat frame, the hooks a game's own chat room reports arrivals with and
 *                 reads the dock's sight from,
 *                 the frames a game fills (the start card and the result), and the round's
 *                 focus mode: the game bar, its panels, full screen and the phase strip; and the
 *                 shared app header (K21). The development sign-in is its own entry
 *                 (`@seasonal/kit/react/dev`, ./dev), so a production bundle never holds it. React
 *                 is an optional peer dependency, so games without React never load
 *                 this entry (SECURITY.md).
 * Source:         new in the kit.
 */
export { AppHeader, type AppHeaderProps, type HeaderAccount, type HeaderLink, } from './AppHeader.js';
export { BackLink, type BackLinkProps } from './BackLink.js';
export { ChatDock, type ChatDockProps } from './ChatDock.js';
export { DockedScreen, type DockedScreenProps } from './DockedScreen.js';
export { useOpenDockChat } from './dockHandOver.js';
export { useDockArrivals, useDockSight, useDockView, type DockSightValue, type DockView, } from './dockSight.js';
export { GameBar, type BarAction, type BarFact, type BarIconName, type BarPress, type BarPressIconName, type BarToggle, type GameBarProps, } from './GameBar.js';
export { PhaseStrip, type PhasePart, type PhaseStripProps } from './PhaseStrip.js';
export { useFocusMode } from './useFocusMode.js';
export { useFullscreen, type Fullscreen } from './useFullscreen.js';
export { StepBadges, type StepBadgesProps } from './StepBadges.js';
export { useApiGet, type Loaded } from './useApiGet.js';
export { useCountdown } from './useCountdown.js';
export { usePanels, type Panels } from './usePanels.js';
export { ResultFrame, type ResultFrameProps } from './ResultFrame.js';
export { StartCard, type Season, type StartCardProps } from './StartCard.js';
export { ThemeToggle, useShownTheme, useTheme } from './theme.js';
export { useDisclosure, type Disclosure } from './useDisclosure.js';
export { useDockReserve } from './useDockReserve.js';
export { useFitScale } from './useFitScale.js';
export { OriginChatFrame, WebsiteChatFrame, type OriginChatFrameProps, type WebsiteChatFrameProps, } from './WebsiteChatFrame.js';
