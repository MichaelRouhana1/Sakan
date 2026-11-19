import { isAxiosError } from 'axios';

/** A rejected location is a recoverable browse destination, not a network failure. */
export function isSearchLocationError(error: unknown): boolean {
  if (!isAxiosError<{ error?: { code?: string } }>(error) || error.response?.status !== 400) return false;
  return ['UNKNOWN_SEARCH_AREA', 'UNKNOWN_SEARCH_CITY', 'AMBIGUOUS_SEARCH_LOCATION']
    .includes(error.response.data.error?.code ?? '');
}
