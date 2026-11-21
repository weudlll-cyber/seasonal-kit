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
export declare class SessionEnds {
    private readonly onError;
    private readonly listeners;
    constructor(onError: (error: Error) => void);
    onEnd(listener: SessionEndsListener): void;
    end(sessionIds: readonly string[]): Promise<void>;
    private report;
}
