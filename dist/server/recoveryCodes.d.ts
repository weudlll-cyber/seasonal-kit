export type RecoveryStyle = 'grouped' | 'hex';
export declare function newRecoveryCodes(style: RecoveryStyle): readonly string[];
export declare function recoveryHash(code: string, style: RecoveryStyle): Buffer;
export declare function looksLikeRecoveryCode(code: string): boolean;
