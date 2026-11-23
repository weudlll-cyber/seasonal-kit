import type { ChatArrivals } from '../chatArrivals.js';
export interface DockSightValue {
    readonly visible: boolean;
    readonly arrivals: ChatArrivals;
}
export declare const DockSight: import("react").Context<DockSightValue | null>;
export declare function useDockSight(): DockSightValue | null;
export declare function useDockArrivals(): ChatArrivals | null;
export type DockView = 'desktop' | 'phone';
export declare function useDockView(): DockView;
