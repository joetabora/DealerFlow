export type { CaptionContext, CaptionConstraints } from "@/lib/caption/types";
export {
  CAPTION_TEMPLATES,
  DEFAULT_CAPTION_TEMPLATE_ID,
  normalizeCaptionTemplateId,
  renderCaptionTemplate,
  type CaptionTemplateId,
} from "@/lib/caption/templates";
export {
  validateCaptionAgainstConstraints,
  type CaptionValidationResult,
} from "@/lib/caption/validate";
