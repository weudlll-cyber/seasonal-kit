export declare const newSecret: () => Uint8Array;
export declare const stepAt: (ms: number) => number;
export declare function hotp(secret: Uint8Array, counter: number): string;
export declare function matchingStep(secret: Uint8Array, code: string, now: number, lastStep: number | null): number | null;
export declare function base32Encode(bytes: Uint8Array): string;
export declare function base32Decode(text: string): Uint8Array | null;
export declare function otpauthUri(secret: Uint8Array, account: string, issuer: string): string;
