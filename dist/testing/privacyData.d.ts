/**
 * @file   src/testing/privacyData.ts
 * @brief  A guard for a game's privacy data list: every table of its PRIVACY-DATA.md answers
 *         every question for every piece of personal data (K107).
 *
 * Responsibility: `findPrivacyGaps(markdown)` reads the file's tables (never inside a code fence)
 *                 and returns what is missing, as text a test shows: no table at all; a table
 *                 without one of the columns of `PRIVACY_COLUMNS` (in any order, in any case; a
 *                 game may add its own) or without a row; a cell of a required column left empty,
 *                 holding only a dash, "?", "TODO" or "TBD", or still the template's "<…>". An
 *                 empty list means the list is filled. It judges that a cell is answered, never
 *                 what the answer says, and cannot know which data a game stores: that stays the
 *                 game's review.
 * Depends on:     nothing
 * Source:         new in the kit; the columns after seasonal-bingo-royale docs/PRIVACY-DATA.md at
 *                 d7d841e (table, field, purpose, how long, deleted when), with who sees it and
 *                 whether it leaves the server added (owner, 2026-11-26).
 * Spec:           docs/templates/PRIVACY-DATA.md; docs/HANDBOOK.md "Before production"
 */
export declare const PRIVACY_COLUMNS: readonly ["Data", "Purpose", "Stored in", "Seen by", "Kept for", "Deleted by", "Leaves the server"];
export declare function findPrivacyGaps(markdown: string): string[];
