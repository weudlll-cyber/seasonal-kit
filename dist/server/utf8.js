/**
 * @file   src/server/utf8.ts
 * @brief  The server entry's one strict UTF-8 decoder.
 *
 * Responsibility: one `TextDecoder('utf-8', { fatal: true })` for the whole entry, so a request
 *                 decodes its name header (./identity) and its steps header (./steps) without
 *                 making a decoder per call. Bytes that are no UTF-8 throw. `decode` without
 *                 `stream` keeps no state between calls, so sharing it is safe.
 * Source:         new in the kit (v0.10.1): the decoder ./identity had since v0.8.0, shared;
 *                 audit 2026-11-22 "Noted, not changed" (B3 info).
 */
export const UTF8 = new TextDecoder('utf-8', { fatal: true });
