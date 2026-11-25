import { type OpenRoundsRead, type StandInMember } from './standInContract.js';
import { type StandInGame } from './standInProxy.js';
export interface StandInOptions {
    readonly games: Readonly<Record<string, StandInGame>>;
    readonly members?: readonly StandInMember[];
}
export interface WebsiteStandIn {
    readonly origin: string;
    readonly signInAs: (memberId: number | null) => void;
    readonly sessionCookie: (memberId: number) => {
        name: string;
        value: string;
        url: string;
    };
    readonly openRounds: (slug: string, publicOrigin?: string) => Promise<OpenRoundsRead>;
    readonly close: () => Promise<void>;
}
export declare function startWebsiteStandIn(options: StandInOptions): Promise<WebsiteStandIn>;
