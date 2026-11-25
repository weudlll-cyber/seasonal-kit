/**
 * @file   src/react/StepBadges.tsx
 * @brief  A member's Discord steps beside a name: one look in every game, the header's.
 *
 * Responsibility: up to three small step icons, each named by its step (the names are read, the
 *                 images are not decorative). An icon is drawn only if its address is exactly the
 *                 website's file (`isStepIcon`, "/media/step-icons/<32 hex>.webp"), so a game that
 *                 passes steps from anywhere cannot make a page load another address; a step with
 *                 another address or none is left out, and nothing at all shows without one.
 *                 `AppHeader`'s account chip uses it, and a game puts it after a name in a board,
 *                 a player list or a lower third (since v0.24.0). Styled by ../../css/steps.css,
 *                 which ../../css/header.css brings along.
 * Source:         the header's own badges (since v0.19.0), moved out of ./AppHeader.tsx unchanged
 *                 but for the shared class names; the lists it replaces are
 *                 seasonal-bingo-royale apps/web/src/components/StepBadges.tsx at 8d20904,
 *                 seasonal-mini-games apps/web/src/round/PlayerSteps.tsx at 9e3c6f3 and
 *                 seasonal-cases apps/web/src/stage/Badges.tsx at 073f9ad (K68). Their match-wide
 *                 context (Bingo) and contract check (Cases) stay in the games.
 * Spec:           Seasonal Entertainment docs/AUTH.md "Embedded games"
 */
import type { ReactElement } from 'react';

import { isStepIcon, MAX_STEPS, type Step } from '../stepShape.js';

export interface StepBadgesProps {
  // As the website sends them; none, or only steps without a drawable icon, renders nothing.
  readonly steps: readonly Step[] | undefined;
  // Extra classes for the place that shows them (the header's own).
  readonly className?: string;
  readonly imageClassName?: string;
}

export function StepBadges(p: StepBadgesProps): ReactElement | null {
  const shown = (p.steps ?? [])
    .slice(0, MAX_STEPS)
    .flatMap((s) => (isStepIcon(s.icon) ? [{ key: s.ladder, name: s.name, src: s.icon }] : []));
  if (shown.length === 0) return null;
  return (
    <span className={['sk-steps', p.className].filter(Boolean).join(' ')} data-testid="steps">
      {shown.map((s) => (
        <img
          key={s.key}
          className={['sk-step', p.imageClassName].filter(Boolean).join(' ')}
          src={s.src}
          alt={s.name}
        />
      ))}
    </span>
  );
}
