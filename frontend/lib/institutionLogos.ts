export function hostFromWebsite(website: string): string | null {
  try {
    return new URL(website).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

/** Best-first logo URLs for an institution site. */
export function institutionLogoCandidates(
  website?: string | null,
  storedLogoUrl?: string | null,
): string[] {
  const host = website ? hostFromWebsite(website) : null;
  const out: string[] = [];
  const push = (url?: string | null) => {
    if (url && !out.includes(url)) out.push(url);
  };
  if (host) {
    push(`https://icon.horse/icon/${host}`);
    push(`https://www.google.com/s2/favicons?domain=${host}&sz=256`);
  }
  push(storedLogoUrl);
  return out;
}
