/**
 * @file   src/react/barButtonClass.ts
 * @brief  The class list of a kit button in a bar: the kit's classes, then the game's own.
 *
 * Responsibility: `barButtonClass` joins `sk-bar-button` (../../css/bar.css), any further kit
 *                 class, and the game's `buttonClassName` (e.g. `smg-btn`, `sbr-btn`) when it
 *                 passes one. Internal: ./GameBar, ./AppHeader, ./MenuFold and ./dev/DevSignIn
 *                 share it; not exported to games.
 * Source:         new in the kit (2026-11-22): the template those four files each wrote out
 *                 (audit 2026-11-22, B4 finding 3).
 */

export function barButtonClass(game: string | undefined, ...kit: readonly string[]): string {
  return ['sk-bar-button', ...kit, ...(game === undefined ? [] : [game])].join(' ');
}
