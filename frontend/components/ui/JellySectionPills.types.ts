export type JellySectionPillItem = {
  id: string;
  label: string;
};

export type JellySectionPillsProps = {
  items: JellySectionPillItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
};
