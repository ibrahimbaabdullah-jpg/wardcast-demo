import { routeRequest } from './static-api';
import type { DemoBundle } from './static-api';

let bundlePromise: Promise<DemoBundle> | undefined;
let sourcesPromise: Promise<unknown> | undefined;

async function loadJson<T>(filename: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${filename}`);
  if (!response.ok)
    throw new Error(`The demo data could not be loaded (${response.status}). Please try again.`);
  return response.json() as Promise<T>;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  options.signal?.throwIfAborted();
  // Consumers share one download, but aborting a view cannot cancel another view's data.
  bundlePromise ??= loadJson<DemoBundle>('demo.json').catch((error: unknown) => {
    bundlePromise = undefined;
    throw error;
  });
  const bundle = await bundlePromise;
  let sources: unknown;
  if (path === '/sources') {
    sourcesPromise ??= loadJson('sources.json').catch((error: unknown) => {
      sourcesPromise = undefined;
      throw error;
    });
    sources = await sourcesPromise;
  }
  options.signal?.throwIfAborted();
  return structuredClone(routeRequest(bundle, sources, path, options)) as T;
}

export const number = (value: number | null | undefined, digits = 0) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('en-GB', {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);
export const percent = (value: number | null | undefined, digits = 1) =>
  value == null ? '—' : `${number(value, digits)}%`;
export const month = (value: string, format: 'short' | 'long' = 'short') => {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB', { month: format, year: 'numeric', timeZone: 'UTC' });
};
export const modelName = (value = '') =>
  ({
    persistence: 'Last observed',
    seasonal: 'Same month last year',
    seasonal_naive: 'Same month last year',
    seasonal_12: 'Same month last year',
    trailing_mean: 'Trailing average',
    trailing_average: 'Trailing average',
    moving_average: 'Trailing average',
    ridge: 'Regularized regression',
    lightgbm: 'LightGBM',
  })[value] ?? value.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
