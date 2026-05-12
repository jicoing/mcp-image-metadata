import type { PricingTier, PricingInfo } from './types.js';

export const PRICING: Record<PricingTier, PricingInfo> = {
  basic: {
    tier: 'basic',
    price: 0.001,
    includes: ['EXIF', 'file info', 'dimensions', 'color profile'],
  },
  standard: {
    tier: 'standard',
    price: 0.002,
    includes: ['Basic + GPS', 'IPTC', 'XMP', 'keywords'],
  },
  premium: {
    tier: 'premium',
    price: 0.005,
    includes: ['Standard + OCR', 'thumbnail', 'deep hash'],
  },
  forensic: {
    tier: 'forensic',
    price: 0.015,
    includes: ['Premium + manipulation analysis', 'full EXIF history'],
  },
};

export function getBatchDiscount(count: number): number {
  if (count >= 100) return 0.3;
  if (count >= 50) return 0.2;
  if (count >= 10) return 0.1;
  return 0;
}

export function calculatePrice(
  tier: PricingTier,
  imageCount: number = 1
): number {
  const basePrice = PRICING[tier].price;
  const discount = getBatchDiscount(imageCount);
  return basePrice * imageCount * (1 - discount);
}

export function getTierFromOptions(options: {
  includeOcr?: boolean;
  includeThumbnail?: boolean;
  includeDeepHash?: boolean;
}): PricingTier {
  if (options.includeOcr || options.includeThumbnail || options.includeDeepHash) {
    return 'premium';
  }
  return 'standard';
}