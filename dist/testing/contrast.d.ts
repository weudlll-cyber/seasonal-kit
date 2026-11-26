export interface ContrastPair {
    readonly text: string;
    readonly on: readonly string[];
    readonly min?: number;
}
export interface ContrastInput {
    readonly css: readonly string[];
    readonly pairs: readonly ContrastPair[];
}
export declare function findLowContrast(input: ContrastInput): string[];
