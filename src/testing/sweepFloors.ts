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

import { wholeCount } from './probe.js';
import type { Size } from './screens.js';

export interface VisibleFloor {
  // The list's items, one match each (a CSS selector).
  readonly selector: string;
  readonly least: number;
  // The decision that asks for it, as the game numbers it: it stands in the finding.
  readonly decision: string;
  readonly sizes?: readonly Size[];
  readonly fonts?: readonly number[];
}

interface At {
  readonly size: Size;
  readonly font: number;
}

const holds = (floor: VisibleFloor, at: At): boolean =>
  (floor.fonts ?? [16]).includes(at.font) &&
  (floor.sizes ?? [at.size]).some((s) => s.width === at.size.width && s.height === at.size.height);

// What this look shows too few of.
export async function floorLines(
  page: Page,
  floors: readonly VisibleFloor[],
  at: At,
): Promise<string[]> {
  const lines: string[] = [];
  for (const floor of floors.filter((f) => holds(f, at))) {
    const seen = await wholeCount(page, floor.selector);
    if (seen < floor.least) {
      lines.push(
        `too few in sight: ${floor.selector}: ${String(seen)} of at least ${String(floor.least)} (${floor.decision})`,
      );
    }
  }
  return lines;
}

// The first floor that none of these looks would check, else undefined.
export function uncheckedFloor(
  floors: readonly VisibleFloor[],
  looks: readonly At[],
): VisibleFloor | undefined {
  return floors.find((floor) => !looks.some((at) => holds(floor, at)));
}
