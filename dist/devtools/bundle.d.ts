export declare const KIT_DEV_MARKERS: readonly string[];
interface ResolveArgs {
    readonly path: string;
    readonly resolveDir: string;
}
interface PluginBuild {
    onResolve(options: {
        readonly filter: RegExp;
    }, callback: (args: ResolveArgs) => {
        readonly path: string;
    } | undefined): void;
}
export interface DevStubPlugin {
    readonly name: string;
    readonly setup: (build: PluginBuild) => void;
}
export declare function devStubPlugin(devModule: RegExp, stub: string): DevStubPlugin;
export declare function devMarkersIn(dir: string, markers: readonly string[]): string[];
export {};
