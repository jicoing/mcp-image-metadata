import express from 'express';
import multer from 'multer';
import path from 'path';
import { extname, resolve } from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { isAbsolute } from 'path/posix';
import {
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { handleExtract, handleBatch, handleAnalyze } from './handlers/extract.js';
import { ExtractInputSchema, BatchInputSchema, AnalyzeInputSchema } from './types.js';
import { PRICING } from './pricing.js';
import { checkFreemium } from './lib/payment.js';

const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 100;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'image/heic',
  'image/bmp',
  'image/svg+xml',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif', '.heic', '.bmp', '.svg'];

function validateMimeType(mimetype: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimetype.toLowerCase());
}

function validateExtension(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!validateExtension(file.originalname)) {
    cb(new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    return;
  }
  if (!validateMimeType(file.mimetype)) {
    cb(new Error(`Invalid MIME type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
    return;
  }
  cb(null, true);
};

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter 
});

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    const sensitivePatterns = [
      /\/etc\/passwd/gi,
      /\/var\/.*\/secret/gi,
      /C:\\.*\\system/gi,
      /token[:=]/gi,
      /password[:=]/gi,
      /api[_-]?key[:=]/gi,
      /secret[:=]/gi,
    ];
    
    let sanitized = message;
    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    return sanitized;
  }
  return 'An internal error occurred';
}

export async function startHttpServer(port: number = 3000) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  async function handleToolsList() {
    return {
      tools: [
        {
          name: 'extract_image_metadata',
          description: `Extract metadata from image (EXIF, GPS, IPTC, XMP). Price: $${PRICING.standard.price} USDC via x402`,
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: { type: 'string' },
              includeOptions: {
                type: 'object',
                properties: {
                  includeGps: { type: 'boolean', default: true },
                  includeColor: { type: 'boolean', default: true },
                  includeThumbnail: { type: 'boolean', default: false },
                  includeOcr: { type: 'boolean', default: false },
                  includeDeepHash: { type: 'boolean', default: false },
                },
              },
              paymentHeader: { type: 'string' },
              payer: { type: 'string' },
            },
          },
        },
        {
          name: 'extract_batch_metadata',
          description: `Extract metadata from multiple images (max 50). Price: $${PRICING.basic.price}-${PRICING.premium.price} USDC via x402`,
          inputSchema: {
            type: 'object',
            properties: {
              imageUrls: { type: 'array', items: { type: 'string' }, maxItems: 50 },
              options: { type: 'object' },
              paymentHeader: { type: 'string' },
              payer: { type: 'string' },
            },
          },
        },
        {
          name: 'detect_image_manipulation',
          description: `Analyze image for manipulation. Price: $${PRICING.standard.price}-${PRICING.forensic.price} USDC via x402`,
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: { type: 'string' },
              analysisLevel: { type: 'string', enum: ['basic', 'standard', 'forensic'] },
              paymentHeader: { type: 'string' },
              payer: { type: 'string' },
            },
          },
        },
        {
          name: 'get_pricing',
          description: 'Get pricing info',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    };
  }

  async function handleToolsCall(params: { name: string; arguments: Record<string, unknown> }) {
    const { name, arguments: args } = params;
    const paymentHeader = args?.paymentHeader as string | undefined;
    const payer = args?.payer as string | undefined;

    try {
      switch (name) {
        case 'extract_image_metadata': {
          const { paymentHeader: _, payer: __, ...rest } = args as Record<string, unknown>;
          const input = ExtractInputSchema.parse(rest);
          const result = await handleExtract(input, paymentHeader, payer);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'extract_batch_metadata': {
          const { paymentHeader: _, payer: __, ...rest } = args as Record<string, unknown>;
          const input = BatchInputSchema.parse(rest);
          const result = await handleBatch(input, paymentHeader, payer);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'detect_image_manipulation': {
          const { paymentHeader: _, payer: __, ...rest } = args as Record<string, unknown>;
          const input = AnalyzeInputSchema.parse(rest);
          const result = await handleAnalyze(input, paymentHeader, payer);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }

        case 'get_pricing': {
          const freemium = checkFreemium(payer);
          return {
            content: [{ type: 'text', text: JSON.stringify({ pricing: PRICING, freemium: { limit: 50, remaining: freemium.remaining } }, null, 2) }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: sanitizeErrorMessage(error) }) }],
        isError: true,
      };
    }
  }

  app.use((req, res, next) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }
    
    next();
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin && ALLOWED_ORIGINS.length > 0) {
      if (!ALLOWED_ORIGINS.includes(origin)) {
        res.status(403).json({ error: 'Origin not allowed' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Payment');
    }
    
    next();
  });

  app.post('/mcp', async (req, res) => {
    try {
      const { method, params, id } = req.body;
      
      if (method === 'tools/list') {
        console.log(`[SECURITY] ${new Date().toISOString()} - tools/list from ${req.ip}`);
        const result = await handleToolsList();
        res.json({ jsonrpc: '2.0', id, result });
      } else if (method === 'tools/call') {
        console.log(`[SECURITY] ${new Date().toISOString()} - tools/call:${params?.name} from ${req.ip}`);
        const result = await handleToolsCall(params);
        res.json({ jsonrpc: '2.0', id, result });
      } else {
        res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
      }
    } catch (error) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${req.path} - ${sanitizeErrorMessage(error)}`);
      res.status(500).json({ 
        jsonrpc: '2.0', 
        id: req.body.id, 
        error: { code: -32603, message: 'Internal error' } 
      });
    }
  });

  app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
      success: true,
      filePath: req.file.path,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'mcp-image-metadata' });
  });

  return app.listen(port, () => {
    console.log(`MCP Image Metadata Server running on http://localhost:${port}/mcp`);
  });
}