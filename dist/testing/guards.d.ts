export interface GuardOptions {
    readonly extensions?: readonly string[];
}
export declare function findFixedColours(paths: readonly string[], options?: GuardOptions): string[];
export declare function findSmallText(paths: readonly string[], options?: GuardOptions & {
    readonly floorPx?: number;
}): string[];
