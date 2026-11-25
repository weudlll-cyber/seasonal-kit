/**
 * @file   src/react/useApiGet.ts
 * @brief  React hook: one GET answer for a screen: idle, loading, failed or ready.
 *
 * Responsibility: `useApiGet(api, path)` calls `api(path)` whenever the path changes and gives
 *                 `{ kind: 'idle' }` for a null path, then `loading`, then `ready` with the value or
 *                 `failed` with the whole `ApiError` (any other failure becomes status 0,
 *                 `NO_ANSWER`). The answer belongs to its path: a late answer of an earlier path is
 *                 dropped, and a screen never shows the previous path's answer for a new one. What
 *                 each state looks like is the game's.
 * Depends on:     react, ../apiClient
 * Source:         seasonal-mini-games apps/web/src/boards/useApi.ts at 9e3c6f3 (the answer tied to
 *                 its path, the whole error) in the shape of seasonal-bingo-royale
 *                 apps/web/src/league/useApiGet.ts at 8d20904 (the four kinds) (K70).
 */
import { useEffect, useState } from 'react';

import { ApiError, type Api } from '../apiClient.js';

export type Loaded<T> =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed'; readonly error: ApiError }
  | { readonly kind: 'ready'; readonly value: T };

interface Answered<T> {
  readonly path: string;
  readonly state: Loaded<T>;
}

// `api` must stay the same between renders (a client made once, outside the component).
export function useApiGet<T>(api: Api, path: string | null): Loaded<T> {
  const [answered, setAnswered] = useState<Answered<T> | null>(null);
  useEffect(() => {
    if (path === null) return undefined;
    let current = true;
    const settle = (state: Loaded<T>): void => {
      if (current) setAnswered({ path, state });
    };
    // A new request for a path seen before starts as loading again.
    setAnswered(null);
    api<T>(path).then(
      (value) => {
        settle({ kind: 'ready', value });
      },
      (error: unknown) => {
        const refusal = error instanceof ApiError ? error : new ApiError(0, 'NO_ANSWER');
        settle({ kind: 'failed', error: refusal });
      },
    );
    return () => {
      current = false;
    };
  }, [api, path]);
  if (path === null) return { kind: 'idle' };
  return answered?.path === path ? answered.state : { kind: 'loading' };
}
