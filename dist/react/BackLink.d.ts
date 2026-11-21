/**
 * @file   src/react/BackLink.tsx
 * @brief  The way back to the website: "← Seasonal Entertainment" at the top left, website
 *         mode only.
 *
 * Responsibility: an ordinary link to the website's games page `/games`, root-relative because
 *                 the game runs under `/games/<slug>/` on the website's origin: same tab, no
 *                 popup. Small and muted (../../css/shell.css `sk-back-link`), in light and dark,
 *                 on its own short first row at phone width. In standalone mode it renders
 *                 nothing.
 * Source:         seasonal-bingo-royale apps/web/src/shell/AppShell.tsx and shell.css
 *                 (`shell-back`) at a43209a; Mini Games has no back link yet (866df03).
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §8 (at e7b995c)
 */
import type { ReactElement } from 'react';
export declare function BackLink(p: {
    readonly websiteMode: boolean;
}): ReactElement | null;
