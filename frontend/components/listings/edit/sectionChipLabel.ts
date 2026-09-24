export function chipLabel(id: string): string {
  switch (id) {
    case "type":
      return "Type";
    case "location":
      return "Location";
    case "specs":
      return "Layout";
    case "utilities":
      return "Utilities";
    case "rules":
      return "Rules";
    case "photos":
      return "Photos";
    case "pricing":
      return "Rent";
    case "copy":
      return "Story";
    case "contact":
      return "Contact";
    case "review":
      return "Card";
    default:
      return id;
  }
}
