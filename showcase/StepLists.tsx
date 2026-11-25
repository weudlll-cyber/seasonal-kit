/**
 * @file   showcase/StepLists.tsx
 * @brief  The step badges beside names away from the header: a board's rows and a lower third.
 *
 * Responsibility: sample members with the showcase's own icons, so the browser run measures that
 *                 a name in a list shows the same badges as the header's chip (./steps.spec.ts).
 *                 Never shipped.
 * Source:         new in the kit (K68).
 */
import type { ReactElement } from 'react';

import { StepBadges } from '../src/react/index.js';
import type { Step } from '../src/stepShape.js';

const icon = (n: number): string => `/media/step-icons/${String(n).padStart(32, '0')}.webp`;
const STEPS: readonly Step[] = [
  { ladder: 'holder', name: 'Diamond holder', icon: icon(1) },
  { ladder: 'farmer', name: 'Golden farmer', icon: icon(2) },
];

export function StepLists(): ReactElement {
  return (
    <section aria-labelledby="steps-title" className="showcase-section">
      <h2 id="steps-title">Steps beside a name</h2>
      <ol data-testid="step-board">
        <li>
          Maximilian-Alexander Ros
          <StepBadges steps={STEPS} />
        </li>
        <li>
          Ana
          <StepBadges steps={undefined} />
        </li>
      </ol>
      <p data-testid="step-lower-third">
        <strong>Walter</strong>
        <StepBadges steps={STEPS.slice(0, 1)} />
      </p>
    </section>
  );
}
