/**
 * @file   src/server/index.ts
 * @brief  The `@seasonal/kit/server` entry: the website sign-in's checks and two-factor sign-in
 *         for a game's server, framework-agnostic and without storage.
 *
 * Responsibility: name everything a game's server may import: the trust checks, the safe
 *                 return path and login hop, the identity headers and their decision, TOTP,
 *                 recovery codes, the rate limiter, the failure brake (since v0.15.0), the guarded fetch (since v0.21.0), the session-end notifier, and the website's
 *                 open-rounds page and season feed (since v0.11.0). Node only (node:crypto,
 *                 node:net); never imported by browser code. Accounts, sessions and every
 *                 database statement stay in the games.
 * Source:         new in the kit.
 */
export { FailureBrake } from './failureBrake.js';
export { isPublicAddress } from './guardedAddress.js';
export { FetchRefused, guardedFetch } from './guardedFetch.js';
export { IDENTITY_HEADERS, identityFrom, isWebsiteGuest, mappedRoles, websiteSignInCheck, } from './identity.js';
export { OPEN_ROUNDS_CACHE_CONTROL, openRoundsPage, } from './openRounds.js';
export { RateLimiter } from './rateLimit.js';
export { looksLikeRecoveryCode, newRecoveryCodes, recoveryHash, recoveryLookups, recoveryMatches, } from './recoveryCodes.js';
export { safeNext, websiteLoginLocation } from './returnPath.js';
export { parseSeasonFeed, seasonFeedReader, } from './seasonFeed.js';
export { SessionEnds } from './sessionEnds.js';
export {} from './steps.js';
export { base32Decode, base32Encode, hotp, matchingStep, newSecret, otpauthUri, stepAt, } from './totp.js';
export { secretMatches, trustedPeers } from './trust.js';
