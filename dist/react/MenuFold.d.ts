/**
 * @file   src/react/MenuFold.tsx
 * @brief  The header's navigation and account, folded into one menu button whenever they do
 *         not fit on one row.
 *
 * Responsibility: wraps the header's items in a panel and puts a "Menu" button before it. While
 *                 the items fit, the button is hidden and the panel lays its items into the bar
 *                 (display: contents, ../../css/header.css). When they would take a second row
 *                 (./useHeaderFold, measured before the paint; since v0.11.0, before it below a
 *                 fixed 960 px), or the window is under the game's `foldBelow` (since v0.13.0),
 *                 the header is folded: one row (brand, Menu, theme toggle), and
 *                 the button opens the panel under it. The
 *                 button reports aria-expanded and names the panel. Opening moves the focus to
 *                 the panel's first item. It closes:
 *                 - on Escape, in the panel or on the button, with the focus on the button;
 *                 - when the focus leaves panel and button (Tab past the last item), so the
 *                   panel never covers what the focus moved to (WCAG 2.4.11);
 *                 - on a press outside;
 *                 - on a new `closeKey` (the route, the account): if the focus was inside the
 *                   panel, it goes to the Menu button instead of the page (WCAG 2.4.3).
 *                 Audit 2026-11-22, B7 findings 2 and 3 (DECISIONS K29). Built on
 *                 ./useDisclosure (its `close` and `dismiss`) and ./usePressOutside since
 *                 v0.10.1.
 * Source:         seasonal-bingo-royale apps/web/src/shell/MenuFold.tsx at a43209a (its `where`
 *                 and `who` are one `closeKey` here; the panel's id is React's own, so two
 *                 headers on a page never share one).
 */
import { type ReactElement, type ReactNode } from 'react';
export interface MenuFoldProps {
    readonly closeKey: string;
    readonly buttonClassName?: string;
    readonly foldBelow?: number;
    readonly children: ReactNode;
}
export declare function MenuFold(p: MenuFoldProps): ReactElement;
