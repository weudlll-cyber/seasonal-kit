export declare function trustedPeers(entries: readonly string[]): (peer: string | undefined) => boolean;
export type HeaderValue = string | readonly string[] | undefined;
export declare function secretMatches(expected: string): (sent: HeaderValue) => boolean;
