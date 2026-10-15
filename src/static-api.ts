import type { Evaluation, Forecast, ForecastResponse, Observation, Trust } from './types.ts';

export interface DemoBundle {
  metadata: Record<string, unknown>;
  trusts: Trust[];
  history: Observation[];
  forecasts: Forecast[];
  evaluation: Evaluation;
}

const monthPattern = /^[0-9]{4}-(0[1-9]|1[0-2])-01$/;

function forecastsFor(bundle: DemoBundle, code: string, cutoff?: string | null): ForecastResponse {
  const trust = bundle.trusts.find((item) => item.code === code);
  if (!trust) throw new Error(`Unknown trust code: ${code}`);
  if (cutoff && !monthPattern.test(cutoff)) throw new Error('Invalid observation cutoff.');
  const available = bundle.forecasts.filter((row) => row.code === code);
  if (!available.length) throw new Error('No forecasts are available for this trust');
  const selected =
    cutoff || available.reduce((latest, row) => (row.cutoff > latest ? row.cutoff : latest), '');
  const forecasts = available
    .filter((row) => row.cutoff === selected)
    .sort((a, b) => a.horizon - b.horizon);
  if (!forecasts.length) throw new Error(`No forecasts for observation cutoff ${selected}`);
  return {
    trust,
    cutoff: selected,
    model_version: [...new Set(forecasts.map((row) => row.model_version))].sort().join(', '),
    data_quality_status: [...new Set(forecasts.map((row) => row.data_quality_status))]
      .sort()
      .join(', '),
    forecasts,
  };
}

/** The public demo reads frozen predictions; it does not train or run Python models. */
export function routeRequest(
  bundle: DemoBundle,
  sources: unknown,
  path: string,
  options: RequestInit = {},
): unknown {
  const url = new URL(path, 'https://wardcast.invalid');
  const method = (options.method || 'GET').toUpperCase();
  if (url.pathname === '/scenarios' && method === 'POST') {
    if (typeof options.body !== 'string') throw new Error('A scenario requires a JSON body.');
    const body: unknown = JSON.parse(options.body);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new Error('Invalid scenario.');
    const values = body as Record<string, unknown>;
    const { trust_code, cutoff, capacity } = values;
    if (Object.keys(values).some((key) => !['trust_code', 'cutoff', 'capacity'].includes(key)))
      throw new Error('Unknown scenario field.');
    if (typeof trust_code !== 'string' || !trust_code || trust_code.length > 32)
      throw new Error('A valid trust code is required.');
    if (typeof capacity !== 'number' || !Number.isFinite(capacity) || capacity <= 0)
      throw new Error('Enter a finite capacity greater than zero.');
    if (cutoff != null && typeof cutoff !== 'string')
      throw new Error('Invalid observation cutoff.');
    const response = forecastsFor(bundle, trust_code, cutoff as string | null | undefined);
    return {
      ...response,
      capacity,
      forecasts: response.forecasts.map((forecast) => {
        const occupancy_pct = (forecast.prediction / capacity) * 100;
        if (!Number.isFinite(occupancy_pct))
          throw new Error('Capacity is too small to calculate finite occupancy.');
        return {
          ...forecast,
          occupancy_pct,
          margin: capacity - forecast.prediction,
          lower_margin: capacity - forecast.upper,
          upper_margin: capacity - forecast.lower,
        };
      }),
    };
  }
  if (method !== 'GET')
    throw new Error('This demo supports read-only data and capacity scenarios.');
  if (url.pathname === '/meta') return bundle.metadata;
  if (url.pathname === '/trusts')
    return { trusts: [...bundle.trusts].sort((a, b) => a.name.localeCompare(b.name)) };
  if (url.pathname === '/evaluation') return bundle.evaluation;
  if (url.pathname === '/sources') return sources;
  const match = /^\/(history|cutoffs|forecasts)\/([^/]+)$/.exec(url.pathname);
  if (!match) throw new Error('Unknown demo data request.');
  const [, kind, rawCode] = match;
  const code = decodeURIComponent(rawCode);
  const trust = bundle.trusts.find((item) => item.code === code);
  if (!trust) throw new Error(`Unknown trust code: ${code}`);
  if (kind === 'history')
    return {
      trust,
      observations: bundle.history
        .filter((row) => row.code === code)
        .sort((a, b) => a.month.localeCompare(b.month)),
    };
  if (kind === 'cutoffs')
    return {
      cutoffs: [
        ...new Set(bundle.forecasts.filter((row) => row.code === code).map((row) => row.cutoff)),
      ]
        .sort()
        .reverse(),
    };
  return forecastsFor(bundle, code, url.searchParams.get('cutoff'));
}
