/**
 * @file   src/server/exactOrigins.ts
 * @brief  A game's list of origins, checked once: each exactly a scheme, a host and a port.
 *
 * Responsibility: `exactOrigins(list, what)` returns the list as a set, or throws a `RangeError`
 *                 naming `what` when an entry is not an http or https origin written the way a
 *                 browser writes it (lower case, a default port left out, no path, no query, no
 *                 user name, no wildcard), so an entry matches by plain equality and nothing
 *                 matches more than it says. The entry itself is never put in the message.
 * Depends on:     nothing
 * Source:         new in the kit (v0.27.0), for ./guardedFetch and ./writeCheck.
 */
export function exactOrigins(list: readonly string[], what: string): ReadonlySet<string> {
  for (const entry of list) {
    // Throws on text that is no address at all, which the message below also covers.
    const origin = URL.canParse(entry) ? new URL(entry).origin : '';
    if (origin !== entry || !/^https?:\/\/[^*]+$/.test(entry)) {
      throw new RangeError(`${what} are exact origins: a scheme, a host and a port`);
    }
  }
  return new Set(list);
}
