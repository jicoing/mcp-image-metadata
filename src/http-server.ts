import express from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export async function startHttpServer(port: number = 3000) {
  const app = express();
  app.use(express.json());

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
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }) }],
        isError: true,
      };
    }
  }

  app.post('/mcp', async (req, res) => {
    try {
      const { method, params, id } = req.body;
      
      if (method === 'tools/list') {
        const result = await handleToolsList();
        res.json({ jsonrpc: '2.0', id, result });
      } else if (method === 'tools/call') {
        const result = await handleToolsCall(params);
        res.json({ jsonrpc: '2.0', id, result });
      } else {
        res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
      }
    } catch (error) {
      res.status(500).json({ 
        jsonrpc: '2.0', 
        id: req.body.id, 
        error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' } 
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