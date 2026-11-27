import type { Locator, Page } from '@playwright/test';
import { type IntendedMotion } from './sweepMotion.js';
export type Theme = 'light' | 'dark';
export interface Size {
    readonly width: number;
    readonly height: number;
}
export declare const DESKTOP: Size;
export declare const PHONE: Size;
export declare const SWEEP_SIZES: readonly Size[];
export declare function settle(page: Page, meant?: readonly IntendedMotion[]): Promise<void>;
export declare function applyTheme(page: Page, theme: Theme): Promise<void>;
export declare function setTheme(page: Page, theme: Theme, meant?: readonly IntendedMotion[]): Promise<void>;
export declare function captureLook(page: Page, dir: string, name: string, show?: Locator): Promise<void>;
