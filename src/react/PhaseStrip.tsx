/**
 * @file   src/react/PhaseStrip.tsx
 * @brief  The phase strip: a round's timeline in parts, the part it is in now.
 *
 * Responsibility: one row across the round's width: the game's parts (Join, Play, Reveal) as
 *                 segments in proportion to their lengths, each with its name and the time it
 *                 ends ("until 1:00"; on a phone the names only). The part the round is in now
 *                 (`at`, the time since the round opened) has a strong frame, fills as it runs
 *                 and says "· now" in words, with `aria-current` too; the others stay plain, so
 *                 colour is never the only sign. A part that has ended is marked done, so in a
 *                 hold after the last part no part is "now". Under the strip the game's one
 *                 line, and a status a screen reader announces once when the phase changes.
 *                 Without timing (`at` null) nothing is "now" or done.
 * Source:         seasonal-mini-games games/mind-games/web/PhaseStrip.tsx and strip.css at
 *                 866df03 (its parts, line and announcements stay in the game's own phases.ts).
 *                 Built on ../clock (clockText).
 * Spec:           Mini Games DECISIONS O92, O97, T351, T386
 */
import type { ReactElement, ReactNode } from 'react';

import { clockText } from '../clock.js';

export interface PhasePart {
  // The game's own id for the part, e.g. `join`.
  readonly id: string;
  readonly name: string;
  // From and to, in ms since the round opened.
  readonly from: number;
  readonly to: number;
}

export interface PhaseStripProps {
  readonly parts: readonly PhasePart[];
  // Ms since the round opened, or null without the round's timing.
  readonly at: number | null;
  readonly label: string;
  readonly line?: ReactNode;
  // Announced once when it changes ("Joining has closed.").
  readonly status?: string;
}

// How far the current part has run, as a share of it, kept inside it.
const filled = (part: PhasePart, at: number): string =>
  `${String(Math.min(100, Math.max(0, ((at - part.from) / Math.max(1, part.to - part.from)) * 100)))}%`;

function PartItem(p: { readonly part: PhasePart; readonly at: number | null }): ReactElement {
  const { part, at } = p;
  const current = at !== null && at >= part.from && at < part.to;
  const done = at !== null && at >= part.to;
  return (
    <li
      className="sk-phase"
      data-sk-phase={part.id}
      data-sk-current={current}
      data-sk-done={done}
      aria-current={current ? 'step' : undefined}
      style={{ flexGrow: Math.max(1, part.to - part.from) }}
    >
      {current ? (
        <span className="sk-phase-fill" aria-hidden="true" style={{ width: filled(part, at) }} />
      ) : null}
      <span className="sk-phase-name">
        {part.name}
        {current ? <span className="sk-phase-now"> · now</span> : null}
      </span>{' '}
      <span className="sk-phase-time">until {clockText(part.to)}</span>
    </li>
  );
}

export function PhaseStrip(p: PhaseStripProps): ReactElement {
  return (
    <div className="sk-phase-strip" data-testid="phase-strip">
      <ol className="sk-phases" aria-label={p.label}>
        {p.parts.map((part) => (
          <PartItem key={part.id} part={part} at={p.at} />
        ))}
      </ol>
      {p.line === undefined ? null : <p className="sk-phase-line">{p.line}</p>}
      {p.status === undefined ? null : (
        <p className="sk-visually-hidden" role="status">
          {p.status}
        </p>
      )}
    </div>
  );
}
