/**
 * @file   src/testing/decision.ts
 * @brief  What a game declares to be meant carries its owner's decision, with a number.
 *
 * Responsibility: `needsNumber(what, decision)` refuses a declaration whose decision names no
 *                 number, so nothing is excused on a sentence alone. Used for intended overlaps
 *                 (./probe, K118) and intended motion (./sweepMotion, K122).
 * Source:         ./probe (the overlaps' check, v0.39.0), moved here for a second user (v0.40.0).
 */
export declare function needsNumber(what: string, decision: string): void;
