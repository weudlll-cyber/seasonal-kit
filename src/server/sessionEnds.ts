/**
 * @file   src/server/sessionEnds.ts
 * @brief  Tells a game's realtime gateway which sessions just ended, so their sockets close.
 *
 * Responsibility: the auth routes report sessions that end: a logout, a sign-in rotating the
 *                 old session, an account the website locked, changed or deleted (its feed), a
 *                 two-factor reset. Every listener hears the ids at once, in the same turn, and
 *                 disconnects their sockets. An empty list tells nobody. A listener that throws,
 *                 or returns a promise that rejects, stops no other: every one hears every end.
 *                 Each failure, as an Error, goes to the game's `onError` (its log); `end` never
 *                 rejects, so a route that does not await it cannot crash the process with an
 *                 unhandled rejection. `end` settles once every listener has finished.
 * Source:         seasonal-mini-games apps/server/src/auth/sessionEnds.ts at 866df03, the same in
 *                 seasonal-bingo-royale at a43209a. Added after the independent reviews: one
 *                 listener's error, thrown or rejected, stops no other and reaches `onError`.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §4 "Account changes and session
 *                 revocation"
 */

export type SessionEndsListener = (sessionIds: readonly string[]) => void | Promise<void>;

const asError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export class SessionEnds {
  private readonly listeners: SessionEndsListener[] = [];

  // `onError`: where a listener's failure goes, the game's log.
  constructor(private readonly onError: (error: Error) => void) {}

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
    for (const result of await Promise.allSettled(pending)) {
      if (result.status === 'rejected') this.report(asError(result.reason));
    }
  }

  // A failing `onError` must not turn into a rejection either.
  private report(error: Error): void {
    try {
      this.onError(error);
    } catch {
      // The game's log failed; the sessions have ended all the same.
    }
  }
}
