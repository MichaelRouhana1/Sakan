import type { SearchSuggestion } from '@/features/search/types';
export const SEARCH_TYPE_LABEL={city:'City',area:'Area',campus:'Campus',place:'Property'} as const;
export function searchChipLabel(item:SearchSuggestion):string {
  if(item.type!=='campus')return item.label.en;
  const [institution,...parts]=item.label.en.split(/\s+[\u2014\u2013]\s+/);
  const campus=parts.join(' \u00b7 ').replace(/\bcampus\b/gi,'').replace(/\s+/g,' ').trim();
  return campus?`${institution} \u00b7 ${campus}`:institution;
}
