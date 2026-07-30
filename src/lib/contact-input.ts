import { z } from "zod";

export {
  CONTACT_ACCEPT,
  CONTACT_MAX_BODY_BYTES,
  CONTACT_MAX_FILE_BYTES,
  contactAttachmentExtension,
  sanitizeContactAttachmentName,
  validateContactAttachmentBytes,
  validateContactAttachmentMetadata,
} from "./contact-attachment";

export const contactInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(160).optional().default(""),
  email: z.email().max(254),
  message: z.string().trim().min(20).max(5000),
  trackId: z.string().trim().max(128).optional(),
  locale: z.enum(["fr", "en"]),
  consent: z.literal(true),
  website: z.string().max(200).optional().default(""),
  startedAt: z.number().int().positive(),
});
