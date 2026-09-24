export type ListingMoreMenuProps = {
  linkCopied: boolean;
  reported: boolean;
  onShare: () => void;
  onReport: () => void;
  /** Hosts cannot report. Hide the action instead of calling an endpoint that rejects them. */
  canReport?: boolean;
};
