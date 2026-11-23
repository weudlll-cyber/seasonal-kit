export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type SeasonToken = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
export interface SeasonFeed {
    readonly v: 1;
    readonly inSeason: {
        readonly season: Season;
        readonly token: SeasonToken;
        readonly since: string;
    };
    readonly halvingDays: readonly {
        readonly day: string;
        readonly token: SeasonToken;
    }[];
}
export declare function parseSeasonFeed(value: unknown): SeasonFeed | null;
export interface SeasonFeedState {
    readonly feed: SeasonFeed | null;
    readonly receivedAt: number | null;
    readonly stale: boolean;
    readonly lastError: string | null;
}
export interface SeasonFeedOptions {
    readonly origin: string;
    readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
    readonly timeoutMs?: number;
    readonly staleAfterMs?: number;
    readonly now?: () => number;
}
export interface SeasonFeedReader {
    readonly refresh: () => Promise<SeasonFeedState>;
    readonly state: () => SeasonFeedState;
}
export declare function seasonFeedReader(options: SeasonFeedOptions): SeasonFeedReader;
