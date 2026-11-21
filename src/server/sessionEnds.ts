/**
 * @file   src/server/sessionEnds.ts
 * @brief  Tells a game's realtime gateway which sessions just ended, so their sockets close.
 *
 * Responsibility: the auth routes report sessions that end: a logout, a sign-in rotating the
 *                 old session, an account the website locked, changed or deleted (its feed), a
 *                 two-factor reset. Every listener hears the ids at once, in the same turn, and
 *                 disconnects their sockets. An empty list tells nobody. A listener that throws,
 *                 or returns a promise that rejects, stops no other: every one hears every end.
 *                 `end` settles once all have finished, and rejects with the first failure (an
 *                 Error, a thrown non-Error wrapped), so no rejection goes unhandled when the
 *                 caller awaits it.
 * Source:         seasonal-mini-games apps/server/src/auth/sessionEnds.ts at 866df03, the same in
 *                 seasonal-bingo-royale at a43209a. Added: one listener's error, thrown or
 *                 rejected, stops no other (review finding 8).
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §4 "Account changes and session
 *                 revocation"
 */

export type SessionEndsListener = (sessionIds: readonly string[]) => void | Promise<void>;

const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export class SessionEnds {
  private readonly listeners: SessionEndsListener[] = [];

  onEnd(listener: SessionEndsListener): void {
    this.listeners.push(listener);
  }

  async end(sessionIds: readonly string[]): Promise<void> {
    if (sessionIds.length === 0) return;
    // Every listener is called now, synchronously; what each returns is awaited after.
    const pending = this.listeners.map((listener) => {
      try {
        return Promise.resolve(listener(sessionIds));
      } catch (error) {
        return Promise.reject(asError(error));
      }
    });
    const settled = await Promise.allSettled(pending);
    const failed = settled.find((s) => s.status === 'rejected');
    if (failed !== undefined) throw asError(failed.reason);
  }
}
