import { extractMetadata, detectManipulation } from '../lib/exif.js';
import { verifyPayment, checkFreemium } from '../lib/payment.js';
import type { ExtractInput, BatchInput, AnalyzeInput, ImageMetadata } from '../types.js';
import { calculatePrice, getTierFromOptions } from '../pricing.js';

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
  try {
    const { imageUrl, includeOptions } = input;
    const options = includeOptions || {};
    const tier = getTierFromOptions(options);
    const price = calculatePrice(tier);

    if (paymentHeader || !checkFreemium(payer).allowed) {
      const payment = await verifyPayment(paymentHeader, tier, payer);
      if (!payment.valid) {
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

    return {
      success: true,
      data,
      price,
      paymentStatus: freemium.allowed ? 'free' : 'paid',
      freemiumRemaining: freemium.allowed ? freemium.remaining : 0,
    };
  } catch (error) {
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
  try {
    const { imageUrls, options } = input;
    const tier = getTierFromOptions(options || {});
    const price = calculatePrice(tier, imageUrls.length);

    if (paymentHeader || !checkFreemium(payer).allowed) {
      const payment = await verifyPayment(paymentHeader, tier, payer);
      if (!payment.valid) {
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

    return {
      success: true,
      data: results,
      price,
      paymentStatus: freemium.allowed ? 'free' : 'paid',
      freemiumRemaining: freemium.allowed ? freemium.remaining : 0,
    };
  } catch (error) {
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
  try {
    const { imageUrl, analysisLevel } = input;
    const tier = analysisLevel as 'basic' | 'standard' | 'forensic';
    const price = calculatePrice(tier);

    if (paymentHeader || !checkFreemium(payer).allowed) {
      const payment = await verifyPayment(paymentHeader, tier, payer);
      if (!payment.valid) {
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

    return {
      success: true,
      data: result,
      price,
      paymentStatus: freemium.allowed ? 'free' : 'paid',
      freemiumRemaining: freemium.allowed ? freemium.remaining : 0,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}