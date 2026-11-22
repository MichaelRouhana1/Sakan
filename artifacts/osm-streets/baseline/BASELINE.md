# Search suites BEFORE the normalize swap (nothing in the repo changed yet)

Commit `aaadb65`. Run on 2026-11-22 against the local Postgres (disposable DBs per suite).

`npm run test:*` scripts chain `npm run build` (tsc) first. tsc fails at HEAD with two pre-existing errors in
`src/modules/listings/listings.repository.ts` (lines 815 and 1103), so the chained scripts stop before running any test
(see `test_search-*.txt`). tsc still emits `dist/`, so the test commands were run directly (the part after `npm run build &&`).

| Suite | Command | Result |
|---|---|---|
| search-catalog | `node --test tests/search-catalog.test.mjs` | pass 15, fail 0 |
| search-suggest integration | `node tests/search-suggest.integration.mjs` | 14 scenarios passed |
| search-suggest assets + frontend codecs | `node --test tests/search-area-assets.test.mjs ../frontend/tests/search-codecs.test.mjs` | pass 7, fail 0 |
| search (unit/browse) | `node tests/unit-search.integration.mjs` | 12 scenarios passed |

Total: 15 + 14 + 7 + 12 = 48 passing, 0 failing. Raw output: `run_catalog.txt`, `run_suggest.txt`, `run_search.txt`.
The same four commands will be rerun after the normalize swap and compared.
