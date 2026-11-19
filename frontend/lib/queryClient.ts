import { QueryClient } from "@tanstack/react-query";
import { isSearchLocationError } from '@/features/search/locationError';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => !isSearchLocationError(error) && failureCount < 1,
    },
  },
});
