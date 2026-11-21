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
 *                 866df03 (its parts, line and announcements stay in the game, ./phases).
 *                 Built on ../clock (clockText).
 * Spec:           Mini Games DECISIONS O92, O97, T351, T386
 */
import type { ReactElement, ReactNode } from 'react';
export interface PhasePart {
    readonly id: string;
    readonly name: string;
    readonly from: number;
    readonly to: number;
}
export interface PhaseStripProps {
    readonly parts: readonly PhasePart[];
    readonly at: number | null;
    readonly label: string;
    readonly line?: ReactNode;
    readonly status?: string;
}
export declare function PhaseStrip(p: PhaseStripProps): ReactElement;
