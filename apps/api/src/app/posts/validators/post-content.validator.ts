import { z } from 'zod';
import { Platform } from '@autocontent-pro/types';

export const PostContentSchema = z.object({
  hook: z.string()
    .min(1, 'Hook is required')
    .max(280, 'Hook must be less than 280 characters'),
  
  body: z.string()
    .min(1, 'Body is required')
    .max(2200, 'Body must be less than 2200 characters'),
  
  hashtags: z.array(z.string().regex(/^#?[a-zA-Z0-9_]+$/, 'Invalid hashtag format'))
    .max(30, 'Maximum 30 hashtags allowed')
    .transform(tags => tags.map(tag => tag.startsWith('#') ? tag : `#${tag}`)),
  
  platforms: z.array(z.nativeEnum(Platform))
    .min(1, 'At least one platform must be selected')
    .max(5, 'Maximum 5 platforms allowed')
});

export type ValidatedPostContent = z.infer<typeof PostContentSchema>;

export function validatePostContent(content: unknown): ValidatedPostContent {
  return PostContentSchema.parse(content);
}

export function validatePostContentSafe(content: unknown) {
  return PostContentSchema.safeParse(content);
}
