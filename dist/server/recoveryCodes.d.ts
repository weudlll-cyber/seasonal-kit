export type RecoveryStyle = 'grouped' | 'hex';
export declare function newRecoveryCodes(style: RecoveryStyle): readonly string[];
export declare function recoveryHash(code: string, style: RecoveryStyle, key: Uint8Array): Buffer;
export declare function recoveryLookups(code: string, style: RecoveryStyle, key: Uint8Array): readonly [Buffer, Buffer];
export declare function recoveryMatches(code: string, style: RecoveryStyle, stored: Uint8Array, key: Uint8Array): boolean;
export declare function looksLikeRecoveryCode(code: string): boolean;
