/**
 * @file   src/testing/sweepFloors.ts
 * @brief  The sweep's floors: at least so many items of a list wholly in sight.
 *
 * Responsibility: an owner's decision that a screen shows at least N rows is declared on the
 *                 sweep's screen (`floors`), with the decision's number. A floor holds at the
 *                 sizes it names (all of the sweep's without them) and at the root fonts it names
 *                 (16 px without them: such a decision speaks of normal text). `floorLines` is
 *                 one look's findings; `uncheckedFloor` names a floor no look of the sweep would
 *                 ever check, which would pass for ever.
 * Depends on:     ./probe (`wholeCount`), ./screens (types); @playwright/test (types)
 * Source:         new in the kit (K116), from Mini Games' guess list of 26 rows, which a
 *                 large-text rule cut to 8 unseen by the sweep (its CI run 45913237237), and
 *                 Bingo Royale's 7 places in the docked result.
 */
import type { Page } from '@playwright/test';
import type { Size } from './screens.js';
export interface VisibleFloor {
    readonly selector: string;
    readonly least: number;
    readonly decision: string;
    readonly sizes?: readonly Size[];
    readonly fonts?: readonly number[];
}
interface At {
    readonly size: Size;
    readonly font: number;
}
export declare function floorLines(page: Page, floors: readonly VisibleFloor[], at: At): Promise<string[]>;
export declare function uncheckedFloor(floors: readonly VisibleFloor[], looks: readonly At[]): VisibleFloor | undefined;
export {};
