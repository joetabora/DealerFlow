const DEFAULT =
  "Check out this {title} — {price} at {location}.";

export function renderDefaultCaption(p: {
  title: string;
  price: string;
  location: string | null;
}): string {
  return DEFAULT.replace("{title}", p.title)
    .replace("{price}", p.price)
    .replace("{location}", (p.location ?? "our location").trim() || "our location");
}
