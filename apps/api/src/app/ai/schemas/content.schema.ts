import { z } from 'zod';

export const PlatformContentSchema = z.object({
  hook: z.string().min(1, 'Hook is required'),
  body: z.string().min(1, 'Body is required'),
  hashtags: z.array(z.string()).min(1, 'At least one hashtag is required'),
  visualIdea: z.string().min(1, 'Visual idea is required'),
});

export const DayContentSchema = z.object({
  dayIndex: z.number().int().min(1).max(30),
  platforms: z.record(z.enum(['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER']), PlatformContentSchema),
});

export const MonthlyContentPlanSchema = z.object({
  days: z.array(DayContentSchema).length(30, 'Must contain exactly 30 days'),
});

export const ContentVariantSchema = z.object({
  hook: z.string().min(1),
  body: z.string().min(1),
  hashtags: z.array(z.string()).min(1),
  visualIdea: z.string().min(1),
});

export const ContentVariantsSchema = z.object({
  variants: z.array(ContentVariantSchema).min(1).max(3),
});

export const GenerateContentRequestSchema = z.object({
  brandId: z.string().min(1, 'Brand ID is required'),
  niche: z.string().min(1, 'Niche is required'),
  persona: z.string().min(1, 'Persona is required'),
  tone: z.enum(['professional', 'casual', 'friendly', 'authoritative', 'playful', 'inspirational']),
  ctaGoals: z.array(z.string()).min(1, 'At least one CTA goal is required'),
  platforms: z.array(z.enum(['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER'])).min(1, 'At least one platform is required'),
  startDate: z.string().datetime('Invalid start date format'),
});

export const GenerateVariantsRequestSchema = z.object({
  variantCount: z.number().int().min(1).max(3).default(2),
  tone: z.enum(['professional', 'casual', 'friendly', 'authoritative', 'playful', 'inspirational']).optional(),
});

export type PlatformContent = z.infer<typeof PlatformContentSchema>;
export type DayContent = z.infer<typeof DayContentSchema>;
export type MonthlyContentPlan = z.infer<typeof MonthlyContentPlanSchema>;
export type ContentVariant = z.infer<typeof ContentVariantSchema>;
export type ContentVariants = z.infer<typeof ContentVariantsSchema>;
export type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;
export type GenerateVariantsRequest = z.infer<typeof GenerateVariantsRequestSchema>;
