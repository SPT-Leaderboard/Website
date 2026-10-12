// Minimal async-data primitive for island components.
//
// WHY THIS EXISTS: Astro wraps every island in a Suspense boundary
// (@astrojs/solid). Solid's createResource entering its loading state
// SUSPENDS that boundary — the island's entire DOM unmounts and remounts
// when (re)fetching (incident 2026-10-12: every profile open deleted the
// leaderboard). This helper keeps fetching OUTSIDE Suspense with plain
// signals, while mimicking the small slice of the resource API the
// components use: data(), error(), loading(), refetch().
//
// Enforced by scripts/check-no-create-resource.mjs (run via `bun run test`).
import { createEffect, createSignal, onCleanup } from 'solid-js';

export interface AsyncResource<T extends NonNullable<unknown>> {
  /** Resolved data; undefined while loading or after an error. */
  data: () => T | undefined;
  error: () => unknown;
  loading: () => boolean;
  /** Re-runs the fetcher (new attempt, same rules). */
  refetch: () => void;
}

export function createAsyncResource<T extends NonNullable<unknown>>(fetcher: () => Promise<T>): AsyncResource<T>;
export function createAsyncResource<S, T extends NonNullable<unknown>>(
  source: () => S,
  fetcher: (source: NonNullable<S>) => Promise<T>,
): AsyncResource<T>;
export function createAsyncResource<S, T extends NonNullable<unknown>>(
  sourceOrFetcher: (() => Promise<T>) | (() => S),
  maybeFetcher?: (source: NonNullable<S>) => Promise<T>,
): AsyncResource<T> {
  const hasSource = maybeFetcher !== undefined;
  const [data, setData] = createSignal<T | undefined>(undefined);
  const [error, setError] = createSignal<unknown>(false);
  const [loading, setLoading] = createSignal(true);
  let attempt = 0;

  const run = () => {
    const seq = ++attempt;
    const fetcher = hasSource
      ? () => (maybeFetcher as (source: NonNullable<S>) => Promise<T>)(
          (sourceOrFetcher as () => S)() as NonNullable<S>,
        )
      : (sourceOrFetcher as () => Promise<T>);
    setLoading(true);
    setError(false);
    fetcher()
      .then((value) => {
        if (seq !== attempt) return;
        setData(() => value); // functional form: value could itself be a function-like object
        setLoading(false);
      })
      .catch((cause) => {
        if (seq !== attempt) return;
        setError(cause);
        setLoading(false);
      });
  };

  createEffect(() => {
    if (hasSource) (sourceOrFetcher as () => S)(); // track the source
    run();
    onCleanup(() => {
      attempt++; // invalidate in-flight responses on disposal
    });
  });

  return { data, error, loading, refetch: run };
}
