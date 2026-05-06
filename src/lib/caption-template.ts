import type { CaptionTemplateId } from "@/lib/caption/templates";
import {
  normalizeCaptionTemplateId,
  renderCaptionTemplate,
} from "@/lib/caption/templates";

/** Active template id (build-time env; safe on client via NEXT_PUBLIC_*). */
export function getActiveCaptionTemplateId(): CaptionTemplateId {
  return normalizeCaptionTemplateId(process.env.NEXT_PUBLIC_CAPTION_TEMPLATE);
}

/** Back-compat single-line style for older call sites — uses `{title}` placeholders. */
export function renderDefaultCaption(p: {
  title: string;
  price: string;
  location: string | null;
  year?: number | null;
  model?: string | null;
  mileage?: number | null;
  cta?: string | null;
}): string {
  return renderCaptionTemplate(getActiveCaptionTemplateId(), {
    title: p.title,
    price: p.price,
    location: p.location,
    year: p.year,
    model: p.model,
    mileage: p.mileage,
    cta: p.cta,
  });
}
