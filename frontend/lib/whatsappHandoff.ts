/** Initiate the handoff before analytics; a lead is not a sent-message receipt. */
export async function handoffWhatsApp(
  url: string,
  listingId: string,
  openUrl: (url: string) => Promise<unknown>,
  recordTap: (listingId: string) => Promise<void>,
): Promise<void> {
  await openUrl(url);
  // Neither a rejected request nor a synchronous analytics failure blocks contact.
  try {
    void recordTap(listingId).catch(() => undefined);
  } catch {
    // Best effort only.
  }
}
