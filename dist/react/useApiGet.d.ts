import { ApiError, type Api } from '../apiClient.js';
export type Loaded<T> = {
    readonly kind: 'idle';
} | {
    readonly kind: 'loading';
} | {
    readonly kind: 'failed';
    readonly error: ApiError;
} | {
    readonly kind: 'ready';
    readonly value: T;
};
export declare function useApiGet<T>(api: Api, path: string | null): Loaded<T>;
