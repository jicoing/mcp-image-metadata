import { calculatePrice, getTierFromOptions } from '../pricing.js';
import type { PricingTier } from '../types.js';

declare const globalThis: {
  fetch: typeof fetch;
} & typeof global;

const X402_FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://facilitator.xpay.sh';
const X402_API_KEY = process.env.X402_API_KEY;
const X402_WALLET_ADDRESS = process.env.X402_WALLET_ADDRESS || '';

const FREEMIUM_LIMIT = parseInt(process.env.FREEMIUM_LIMIT || '50');

interface UsageRecord {
  count: number;
  totalPaid: number;
}

const usageMap = new Map<string, UsageRecord>();

interface PaymentVerification {
  valid: boolean;
  payer?: string;
  amount?: string;
  isFree?: boolean;
  remainingFree?: number;
  error?: string;
}

function getUsageKey(payer?: string): string {
  return payer || 'anonymous';
}

export function checkFreemium(payer?: string): { allowed: boolean; remaining: number } {
  const key = getUsageKey(payer);
  const usage = usageMap.get(key) || { count: 0, totalPaid: 0 };
  
  const remaining = Math.max(0, FREEMIUM_LIMIT - usage.count);
  return {
    allowed: usage.count < FREEMIUM_LIMIT,
    remaining,
  };
}

export function recordUsage(payer?: string, paid: boolean = false): void {
  const key = getUsageKey(payer);
  const usage = usageMap.get(key) || { count: 0, totalPaid: 0 };
  usage.count += 1;
  if (paid) usage.totalPaid += 1;
  usageMap.set(key, usage);
}

export function getUsageStats(payer?: string): { requests: number; paid: number; remaining: number } {
  const key = getUsageKey(payer);
  const usage = usageMap.get(key) || { count: 0, totalPaid: 0 };
  return {
    requests: usage.count,
    paid: usage.totalPaid,
    remaining: Math.max(0, FREEMIUM_LIMIT - usage.count),
  };
}

export async function verifyPayment(
  paymentHeader: string | undefined,
  tier: PricingTier,
  payer?: string
): Promise<PaymentVerification> {
  const freemium = checkFreemium(payer);
  
  if (freemium.allowed) {
    recordUsage(payer, false);
    return { 
      valid: true, 
      isFree: true, 
      remainingFree: freemium.remaining - 1 
    };
  }

  if (!paymentHeader) {
    return { 
      valid: false, 
      error: `Freemium limit (${FREEMIUM_LIMIT}) exceeded. Payment required.`,
      remainingFree: 0,
    };
  }

  if (!X402_API_KEY || !X402_WALLET_ADDRESS) {
    console.error('x402 not configured - allowing free access');
    return { valid: true, isFree: true };
  }

  try {
    const price = calculatePrice(tier);
    const amountWei = Math.floor(price * 1e6).toString();

    const response = await fetch(`${X402_FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': X402_API_KEY,
      },
      body: JSON.stringify({
        payment: paymentHeader,
        payTo: X402_WALLET_ADDRESS,
        amount: amountWei,
        network: process.env.X402_NETWORK || 'base-sepolia',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { valid: false, error: `Payment verification failed: ${error}` };
    }

    const result = await response.json() as { valid: boolean; payer?: string; amount?: string };
    
    if (result.valid) {
      recordUsage(payer, true);
    }
    
    return {
      valid: result.valid,
      payer: result.payer,
      amount: result.amount,
      isFree: false,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Payment verification error',
    };
  }
}

export function getPaymentRequirements(tier: PricingTier) {
  const price = calculatePrice(tier);
  return {
    scheme: 'exact',
    asset: 'USDC',
    amount: price.toString(),
    network: process.env.X402_NETWORK || 'base-sepolia',
    freemium: FREEMIUM_LIMIT,
  };
}