// Read-only: print typed suggestions from the dev catalog. Run `npm run build` first.
import 'dotenv/config';
const { searchService } = await import('../../dist/modules/search/search.service.js');
const queries = process.argv.slice(2).length ? process.argv.slice(2)
  : ['bliss', 'شارع بليس', 'rue bliss', 'hamra', 'hamra street', 'الحمراء', 'sassine', 'st joseph', 'monot', 'mo', 'bl', 'bli', 'rue', 'mar elias', 'abdel aziz'];
for (const q of queries) {
  const r = await searchService.suggest(q, 10);
  console.log(`\n${JSON.stringify(q)} -> ${JSON.stringify(r.normalizedQuery)}`);
  for (const x of r.results) {
    const count = x.type === 'street' || x.type === 'hood'
      ? (x.fallback ? `${x.fallback.count} places in ${x.fallback.label.en}` : `${x.eligibleUnitCount} places near ${x.label.en}`)
      : `${x.eligibleUnitCount ?? 0} places`;
    console.log(`  ${x.type.padEnd(6)} ${x.label.en} · ${x.context.en}  [${count}]  ${x.url}`);
  }
}
process.exit(0);
