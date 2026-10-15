# WardCast — GitHub Pages demo

**Explore hospital capacity forecasts in your browser.**

[Open the live demo](https://ibrahimbaabdullah-jpg.github.io/wardcast-demo/)

This separate static demo presents the existing WardCast forecast snapshot. It
preserves the original project and its Python training/backend implementation.
The original repository remains unchanged and private.

## Explore

- Trust-level occupied and available adult general-and-acute beds.
- Three monthly forecast horizons with nominal 80% prediction intervals.
- Capacity scenarios, calculated locally without changing predicted occupied beds.
- Historical replay, explanations, baseline comparisons, measured errors and coverage.
- Data-quality flags and all 48 official NHS source publications.

The observations cover April 2022–March 2026: 124 trust codes and 5,873 monthly
records. All 8,949 saved forecasts are included. These are retrospective forecasts,
not a current NHS feed. No patient data, API keys, paid services, or Python server
are needed by a visitor. Models are not trained or executed in the browser.

The selected models achieved test MAE of 12.51, 15.56 and 17.12 beds for horizons
1–3. Measured interval coverage was 75.8%, 76.2% and 79.4%, below the nominal 80%
target. See the [benchmark](reference/benchmark.md), [model card](reference/model-card.md)
and [data definition](reference/data.md) copied from the original release.
Documents in `reference/` describe that original full implementation; its Python
commands and artifact paths are not commands for this static demo.

## Run and build

Requires Node 22.12+ and pnpm 11.25.0.

```bash
pnpm install --frozen-lockfile
pnpm test:unit
pnpm build
pnpm preview --port 4173
```

Open http://127.0.0.1:4173/wardcast-demo/.

```bash
pnpm exec playwright install chromium
pnpm test:e2e
pnpm screenshots
```

The browser tests run against the static production build, without a backend.
Set `WARDCAST_WEB_URL` to test the deployed site instead.

## Deployment

GitHub Pages serves the committed `docs/` directory from `main`. Run `pnpm build`
after a source change and commit the resulting `docs/` files. Vite uses
`/wardcast-demo/` as its base path. `docs/.nojekyll` preserves the static build.

`src/static-api.ts` implements the read-only browser data interface and validated
scenario arithmetic. `public/data/` contains a minified copy of the existing
forecast snapshot and source manifest, without changing any numeric values.
The build copies these files into `docs/data/`.

Original code is MIT-licensed. NHS data have separate attribution and reuse terms:
[code licence](LICENSE) · [data attribution](DATA_LICENSE.md).
