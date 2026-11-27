import type { StandInMember } from './standInContract.js';
export declare const previewUsage = "usage: sk-preview --slug <game> --app <http://127.0.0.1:port> --secret-header <name>\n                  --secret-env <VARIABLE> [--port 4400] [--role member|organiser|admin]\n                  [--can-host]\n  --slug           the game's name under /games/<slug>/\n  --app            where the game, running in website mode, answers on this computer\n  --secret-header  the header the game trusts the website's proxy by\n  --secret-env     the environment variable holding that header's value, as the game reads it\n  --port           where the preview listens (default 4400)\n  --role           the test member's role (default member); --can-host lets the member host\nStop it with Ctrl+C.";
export interface PreviewSettings {
    readonly slug: string;
    readonly app: string;
    readonly secretHeader: string;
    readonly secret: string;
    readonly port: number;
    readonly role: StandInMember['role'];
    readonly canHost: boolean;
}
export declare function previewSettings(argv: readonly string[], env: Readonly<Record<string, string | undefined>>): PreviewSettings;
export interface Preview {
    readonly address: string;
    readonly origin: string;
    readonly stop: () => Promise<void>;
}
export declare function startPreview(settings: PreviewSettings): Promise<Preview>;
export declare function runPreview(argv: readonly string[], env: Readonly<Record<string, string | undefined>>, say: (line: string) => void, onStop: (stop: () => Promise<void>) => void): Promise<number>;
