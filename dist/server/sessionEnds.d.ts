/**
 * @file   src/server/sessionEnds.ts
 * @brief  Tells a game's realtime gateway which sessions just ended, so their sockets close.
 *
 * Responsibility: the auth routes report sessions that end: a logout, a sign-in rotating the
 *                 old session, an account the website locked, changed or deleted (its feed), a
 *                 two-factor reset. Every listener (the gateway) hears the ids at once and
 *                 disconnects their sockets. An empty list tells nobody. A listener that throws
 *                 does not stop the others: every one hears every end, and the first error is
 *                 thrown after all have heard it.
 * Source:         seasonal-mini-games apps/server/src/auth/sessionEnds.ts at 866df03, the same in
 *                 seasonal-bingo-royale at a43209a. Added: one listener's error stops no other.
 * Spec:           Seasonal Entertainment docs/GAME-INTEGRATION.md §4 "Account changes and session
 *                 revocation"
 */
export type SessionEndsListener = (sessionIds: readonly string[]) => void;
export declare class SessionEnds {
    private readonly listeners;
    onEnd(listener: SessionEndsListener): void;
    end(sessionIds: readonly string[]): void;
}
