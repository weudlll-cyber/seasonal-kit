/**
 * @file   src/localPath.ts
 * @brief  Whether a path stays on this site: the one check behind every redirect and frame
 *         address the kit builds, in the browser and on the server.
 *
 * Responsibility: `isLocalPath` is true for printable ASCII only (no space, tab, CR, LF or any
 *                 other control character), with one leading slash, no second one right after
 *                 it, and no backslash anywhere. Browsers read "//" and "\" as the start of
 *                 another host, and the URL parser drops a tab or newline before it parses, so
 *                 "/\t/evil.example" would become "//evil.example" (audit 2026-11-22, B1
 *                 finding 1). No DOM and no Node API, so ../websiteSignIn.ts, ../chatEmbed.ts and
 *                 ./server/returnPath.ts share it.
 * Source:         new in the kit (2026-11-22): `isLocalPath` of ./websiteSignIn.ts and the
 *                 login-path check of ./server/returnPath.ts, merged, with the printable-ASCII
 *                 rule `safeNext` already applied.
 */
export declare function isLocalPath(path: string): boolean;
