import { type HeaderValue } from './trust.js';
export interface WriteRequest {
    readonly method: string;
    readonly headers: Readonly<Record<string, HeaderValue>>;
    readonly peer: string | undefined;
    readonly url?: string;
}
export interface CrossOriginWrite {
    readonly method: string;
    readonly path: string;
    readonly origins: readonly string[];
}
export interface WriteCheckOptions {
    readonly trustedProxies?: readonly string[];
    readonly crossOrigin?: readonly CrossOriginWrite[];
}
export type WriteDecision = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly reason: 'cross-site' | 'origin-mismatch' | 'no-origin' | 'bad-header';
};
export declare function writeCheck(options?: WriteCheckOptions): (request: WriteRequest) => WriteDecision;
