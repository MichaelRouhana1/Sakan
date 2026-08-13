/** Debug ingest no-op. Keep call sites compiling without shipping LAN ingest. */
export function agentDebugLog(
  _hypothesisId: string,
  _location: string,
  _message: string,
  _data: Record<string, unknown> = {},
) {}
