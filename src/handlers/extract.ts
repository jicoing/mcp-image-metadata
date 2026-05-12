import { extractMetadata, detectManipulation } from '../lib/exif.js';
import { verifyPayment, checkFreemium } from '../lib/payment.js';
import type { ExtractInput, BatchInput, AnalyzeInput, ImageMetadata } from '../types.js';
import { calculatePrice, getTierFromOptions } from '../pricing.js';
import { isSafeFilePath, cleanupFile as removeFile } from '../lib/path-utils.js';
import fs from 'fs';

function cleanupFile(imagePath: string): void {
  if (isSafeFilePath(imagePath)) {
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch {
      console.error(`Cleanup failed for: ${imagePath}`);
    }
  }
}

function validateImagePath(imagePath: string): { valid: boolean; error?: string } {
  if (!imagePath || typeof imagePath !== 'string') {
    return { valid: false, error: 'Invalid image path' };
  }
  
  if (!isSafeFilePath(imagePath)) {
    return { valid: false, error: 'Path traversal detected or invalid path' };
  }
  
  return { valid: true };
}

export async function handleExtract(
  input: ExtractInput,
  paymentHeader?: string,
  payer?: string
): Promise<{
  success: boolean;
  data?: ImageMetadata;
  price?: number;
  paymentStatus?: string;
  freemiumRemaining?: number;
  error?: string;
}> {
  const { imageUrl, includeOptions } = input;
  const options = includeOptions || {};
  const tier = getTierFromOptions(options);
  const price = calculatePrice(tier);

  const pathValidation = validateImagePath(imageUrl);
  if (!pathValidation.valid) {
    return {
      success: false,
      error: pathValidation.error,
    };
  }

  try {
    if (paymentHeader || !checkFreemium(payer).allowed) {
      const payment = await verifyPayment(paymentHeader, tier, payer);
      if (!payment.valid) {
        cleanupFile(imageUrl);
        return {
          success: false,
          price,
          paymentStatus: 'failed',
          freemiumRemaining: 0,
          error: payment.error || 'Payment verification failed',
        };
      }
    }

    const freemium = checkFreemium(payer);
    const data = await extractMetadata(imageUrl, options);
    cleanupFile(imageUrl);

    return {
      success: true,
      data,
      price,
      paymentStatus: freemium.allowed ? 'free' : 'paid',
      freemiumRemaining: freemium.allowed ? freemium.remaining : 0,
    };
  } catch (error) {
    cleanupFile(imageUrl);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function handleBatch(
  input: BatchInput,
  paymentHeader?: string,
  payer?: string
): Promise<{
  success: boolean;
  data?: ImageMetadata[];
  price?: number;
  paymentStatus?: string;
  freemiumRemaining?: number;
  error?: string;
}> {
  const { imageUrls, options } = input;
  const tier = getTierFromOptions(options || {});
  const price = calculatePrice(tier, imageUrls.length);

  for (const url of imageUrls) {
    const pathValidation = validateImagePath(url);
    if (!pathValidation.valid) {
      return {
        success: false,
        error: `Invalid path in batch: ${pathValidation.error}`,
      };
    }
  }

  try {
    if (paymentHeader || !checkFreemium(payer).allowed) {
      const payment = await verifyPayment(paymentHeader, tier, payer);
      if (!payment.valid) {
        imageUrls.forEach(cleanupFile);
        return {
          success: false,
          price,
          paymentStatus: 'failed',
          freemiumRemaining: 0,
          error: payment.error || 'Payment verification failed',
        };
      }
    }

    const freemium = checkFreemium(payer);
    const results = await Promise.all(
      imageUrls.map(url => extractMetadata(url, options))
    );
    imageUrls.forEach(cleanupFile);

    return {
      success: true,
      data: results,
      price,
      paymentStatus: freemium.allowed ? 'free' : 'paid',
      freemiumRemaining: freemium.allowed ? freemium.remaining : 0,
    };
  } catch (error) {
    imageUrls.forEach(cleanupFile);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function handleAnalyze(
  input: AnalyzeInput,
  paymentHeader?: string,
  payer?: string
): Promise<{
  success: boolean;
  data?: {
    isManipulated: boolean;
    confidence: number;
    details: string[];
  };
  price?: number;
  paymentStatus?: string;
  freemiumRemaining?: number;
  error?: string;
}> {
  const { imageUrl, analysisLevel } = input;
  const tier = analysisLevel as 'basic' | 'standard' | 'forensic';
  const price = calculatePrice(tier);

  const pathValidation = validateImagePath(imageUrl);
  if (!pathValidation.valid) {
    return {
      success: false,
      error: pathValidation.error,
    };
  }

  try {
    if (paymentHeader || !checkFreemium(payer).allowed) {
      const payment = await verifyPayment(paymentHeader, tier, payer);
      if (!payment.valid) {
        cleanupFile(imageUrl);
        return {
          success: false,
          price,
          paymentStatus: 'failed',
          freemiumRemaining: 0,
          error: payment.error || 'Payment verification failed',
        };
      }
    }

    const freemium = checkFreemium(payer);
    const result = await detectManipulation(imageUrl, analysisLevel);
    cleanupFile(imageUrl);

    return {
      success: true,
      data: result,
      price,
      paymentStatus: freemium.allowed ? 'free' : 'paid',
      freemiumRemaining: freemium.allowed ? freemium.remaining : 0,
    };
  } catch (error) {
    cleanupFile(imageUrl);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}