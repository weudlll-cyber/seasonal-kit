/**
 * @file   src/react/MenuFold.tsx
 * @brief  The header's navigation and account, folded into one menu button below 960 px.
 *
 * Responsibility: wraps the header's items in a panel and puts a "Menu" button before it. On a
 *                 wide screen the button is hidden and the panel lays its items into the bar
 *                 (display: contents, ../../css/header.css). Below 960 px the bar is one row
 *                 (brand, theme toggle, Menu), and the button opens the panel under it. The
 *                 button reports aria-expanded and names the panel. Opening moves the focus to
 *                 the panel's first item; Escape closes it and gives the focus back. A press
 *                 outside, or a new `closeKey` (the route, the account, the chat opening),
 *                 closes it.
 * Source:         seasonal-bingo-royale apps/web/src/shell/MenuFold.tsx at a43209a (its `where`
 *                 and `who` are one `closeKey` here; the panel's id is React's own, so two
 *                 headers on a page never share one).
 */
import { type ReactElement, type ReactNode } from 'react';
export interface MenuFoldProps {
    readonly closeKey: string;
    readonly buttonClassName?: string;
    readonly children: ReactNode;
}
export declare function MenuFold(p: MenuFoldProps): ReactElement;
