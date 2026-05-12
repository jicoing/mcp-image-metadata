import { z } from 'zod';

function safePathString() {
  return z.string().min(1, 'Path cannot be empty').max(500, 'Path too long').refine(
    (val) => !val.includes('..') && !val.includes('%2e'),
    'Path traversal detected'
  );
}

export const ExtractOptionsSchema = z.object({
  includeGps: z.boolean().default(true),
  includeColor: z.boolean().default(true),
  includeThumbnail: z.boolean().default(false),
  includeOcr: z.boolean().default(false),
  includeDeepHash: z.boolean().default(false),
});

export type ExtractOptions = z.infer<typeof ExtractOptionsSchema>;

export const ExtractInputSchema = z.object({
  imageUrl: safePathString(),
  includeOptions: ExtractOptionsSchema.optional(),
});

export type ExtractInput = z.infer<typeof ExtractInputSchema>;

export const BatchInputSchema = z.object({
  imageUrls: z.array(safePathString()).max(50),
  options: ExtractOptionsSchema.optional(),
});

export type BatchInput = z.infer<typeof BatchInputSchema>;

export const AnalyzeInputSchema = z.object({
  imageUrl: safePathString(),
  analysisLevel: z.enum(['basic', 'standard', 'forensic']).default('standard'),
});

export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

export interface ExifData {
  cameraMake?: string;
  cameraModel?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTime?: string;
  flash?: string;
  whiteBalance?: string;
  exposureMode?: string;
}

export interface GpsData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  gpsTimestamp?: string;
}

export interface FileData {
  width: number;
  height: number;
  format: string;
  colorDepth?: number;
  bitDepth?: number;
  dpi?: number;
  fileSize: number;
  mimeType: string;
}

export interface ColorData {
  colorProfile?: string;
  dominantColors?: string[];
  hasIccProfile: boolean;
}

export interface IptcData {
  keywords?: string[];
  caption?: string;
  headline?: string;
  credit?: string;
  copyright?: string;
  city?: string;
  country?: string;
  byline?: string;
  bylineTitle?: string;
}

export interface XmpData {
  creator?: string;
  title?: string;
  description?: string;
  rating?: number;
  labels?: string[];
  tags?: string[];
}

export interface AnimationData {
  frameCount?: number;
  duration?: number;
  loopCount?: number;
}

export interface ImageMetadata {
  exif?: ExifData;
  gps?: GpsData;
  file: FileData;
  color?: ColorData;
  iptc?: IptcData;
  xmp?: XmpData;
  animation?: AnimationData;
  thumbnail?: string;
  ocr?: string;
  deepHash?: string;
}

export type PricingTier = 'basic' | 'standard' | 'premium' | 'forensic';

export interface PricingInfo {
  tier: PricingTier;
  price: number;
  includes: string[];
}