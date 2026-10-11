// Local API fixture: scoring executes in the test server process, never the browser.
import { rankListings, explainWidening } from '../../backend/dist/modules/search/matcher.scoring.js';
import { extractMatchFacts } from '../../backend/dist/modules/search/matcher.facts.js';
export function searchResponse(rows, params) {
  const prefs = params.matcher ? JSON.parse(params.matcher) : {version:1};
  const candidates = rows.filter(l => !params.maxRentUsd || l.monthlyRentUsd <= Number(params.maxRentUsd))
    .map(l => ({...l,matchFacts:extractMatchFacts(l)}));
  const ranked = rankListings(candidates,prefs);
  const data = params.sort === 'match' ? ranked.listings : candidates.filter(l => !params.matcher || ranked.listings.some(m => m.id === l.id));
  return {data, featured:[], matches:ranked.matches, widening:explainWidening(ranked.listings,prefs), pagination:{page:1,pageSize:24,total:data.length,totalMatching:data.length,hasNext:false}};
}
