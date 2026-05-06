import { z } from "zod";
import type { CaptionContext } from "@/lib/caption/types";

const templateDefSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  body: z.string().min(1),
  constraints: z
    .object({
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(1).optional(),
      maxHashtagCount: z.number().int().min(0).optional(),
    })
    .optional(),
});

/** Named templates; extend here until a DB-backed editor ships. */
export const CAPTION_TEMPLATES = {
  fb_feed_simple: templateDefSchema.parse({
    id: "fb_feed_simple",
    label: "Facebook · simple",
    body: "Check out this {title} — {price} at {location}.\n\n{cta}",
    constraints: {
      minLength: 24,
      maxLength: 5000,
      maxHashtagCount: 120,
    },
  }),
  ig_feed_simple: templateDefSchema.parse({
    id: "ig_feed_simple",
    label: "Instagram · feed",
    body: "{title}\n{price} · {location}\n{mileage}\n\n{cta}",
    constraints: {
      minLength: 10,
      maxLength: 2200,
      maxHashtagCount: 30,
    },
  }),
  ig_reel_caption: templateDefSchema.parse({
    id: "ig_reel_caption",
    label: "Instagram · reel caption",
    body: "{year} {model} — {title}\n{price}\n{cta}",
    constraints: {
      minLength: 8,
      maxLength: 2200,
      maxHashtagCount: 30,
    },
  }),
} as const;

export type CaptionTemplateId = keyof typeof CAPTION_TEMPLATES;

export const DEFAULT_CAPTION_TEMPLATE_ID: CaptionTemplateId = "fb_feed_simple";

export function normalizeCaptionTemplateId(
  raw: string | undefined | null,
): CaptionTemplateId {
  const k = String(raw ?? "").trim() as CaptionTemplateId;
  if (k in CAPTION_TEMPLATES) return k;
  return DEFAULT_CAPTION_TEMPLATE_ID;
}

function formatMileage(m: number | null | undefined): string {
  if (m == null || Number.isNaN(m)) return "";
  return `${m.toLocaleString()} mi`;
}

/** Substitute `{placeholders}`; unknown tokens remain unchanged. */
export function renderCaptionTemplate(
  templateId: CaptionTemplateId,
  ctx: CaptionContext,
): string {
  const def = CAPTION_TEMPLATES[templateId];
  const loc = String(ctx.location ?? "").trim() || "our location";
  const mileageLine = formatMileage(ctx.mileage);
  const cta =
    String(ctx.cta ?? "").trim() ||
    process.env.NEXT_PUBLIC_DEFAULT_CAPTION_CTA?.trim() ||
    "Give us a call or stop in today!";
  let out = def.body;
  const map: Record<string, string> = {
    title: String(ctx.title ?? "").trim() || "This unit",
    price: String(ctx.price ?? "").trim() || "—",
    location: loc,
    year: ctx.year != null ? String(ctx.year) : "",
    model: String(ctx.model ?? "").trim(),
    mileage: mileageLine,
    cta,
  };
  for (const [key, val] of Object.entries(map)) {
    out = out.replaceAll(`{${key}}`, val);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
