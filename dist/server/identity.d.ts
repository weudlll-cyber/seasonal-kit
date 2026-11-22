import { type Step, type StepsMode } from './steps.js';
import { type HeaderValue } from './trust.js';
export interface IdentityHeaders {
    readonly id: string;
    readonly name: string;
    readonly roles: string;
    readonly emailVerified: string;
    readonly canHost: string;
    readonly steps: string;
    readonly guest: string;
}
export declare const IDENTITY_HEADERS: IdentityHeaders;
export interface WebsiteIdentity {
    readonly subject: string;
    readonly websiteName: string;
    readonly displayName: string;
    readonly roles: readonly string[];
    readonly emailVerified: boolean;
    readonly canHost: boolean;
    readonly steps: readonly Step[];
    readonly badSteps: boolean;
}
export type RequestHeaders = Readonly<Record<string, HeaderValue>>;
export declare function isWebsiteGuest(headers: RequestHeaders, names?: IdentityHeaders): boolean;
export declare function identityFrom(headers: RequestHeaders, steps: StepsMode, names?: IdentityHeaders): WebsiteIdentity | null;
export declare function mappedRoles(who: Pick<WebsiteIdentity, 'roles' | 'canHost'>): readonly string[];
export interface SignInCheck {
    readonly trustedProxies: readonly string[];
    readonly proxySecret: string;
    readonly secretHeader: string;
    readonly steps: StepsMode;
    readonly names?: IdentityHeaders;
}
export type SignInDecision = {
    readonly kind: 'untrusted';
} | {
    readonly kind: 'guest';
} | {
    readonly kind: 'invalid';
} | {
    readonly kind: 'member';
    readonly identity: WebsiteIdentity;
};
export declare function websiteSignInCheck(check: SignInCheck): (peer: string | undefined, headers: RequestHeaders) => SignInDecision;
