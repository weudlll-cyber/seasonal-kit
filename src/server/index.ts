/**
 * @file   src/server/index.ts
 * @brief  The `@seasonal/kit/server` entry: the website sign-in's checks and two-factor sign-in
 *         for a game's server, framework-agnostic and without storage.
 *
 * Responsibility: name everything a game's server may import: the trust checks, the safe
 *                 return path and login hop, the identity headers and their decision, TOTP,
 *                 recovery codes, the rate limiter and the session-end notifier. Node only
 *                 (node:crypto, node:net); never imported by browser code. Accounts, sessions and
 *                 every database statement stay in the games.
 */
export {
  IDENTITY_HEADERS,
  identityFrom,
  isWebsiteGuest,
  mappedRoles,
  websiteSignInCheck,
  type Headers,
  type IdentityHeaders,
  type SignInCheck,
  type SignInDecision,
  type WebsiteIdentity,
} from './identity.js';
export { RateLimiter, type RateDecision, type RateRule } from './rateLimit.js';
export {
  looksLikeRecoveryCode,
  newRecoveryCodes,
  recoveryHash,
  recoveryLookups,
  recoveryMatches,
  type RecoveryStyle,
} from './recoveryCodes.js';
export { safeNext, websiteLoginLocation } from './returnPath.js';
export { SessionEnds, type SessionEndsListener } from './sessionEnds.js';
export { type Ladder, type Step, type StepsMode } from './steps.js';
export {
  base32Decode,
  base32Encode,
  hotp,
  matchingStep,
  newSecret,
  otpauthUri,
  stepAt,
} from './totp.js';
export { secretMatches, trustedPeers, type HeaderValue } from './trust.js';
