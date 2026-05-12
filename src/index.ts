import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { handleExtract, handleBatch, handleAnalyze } from './handlers/extract.js';
import { ExtractInputSchema, BatchInputSchema, AnalyzeInputSchema } from './types.js';
import { PRICING } from './pricing.js';
import { checkFreemium } from './lib/payment.js';

const PORT = process.env.PORT;

if (PORT) {
  import('./http-server.js').then(m => {
    m.startHttpServer(parseInt(PORT));
  });
} else {
  const server = new Server(
    {
      name: 'mcp-image-metadata',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'extract_image_metadata',
          description: `Extract metadata from image (EXIF, GPS, IPTC, XMP). Price: $${PRICING.standard.price} USDC via x402`,
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: {
                type: 'string',
                description: 'URL or file path to the image',
              },
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
              paymentHeader: {
                type: 'string',
                description: 'x402 payment header (if paying for access)',
              },
              payer: {
                type: 'string',
                description: 'Caller wallet address (for freemium tracking)',
              },
            },
            required: ['imageUrl'],
          },
        },
        {
          name: 'extract_batch_metadata',
          description: `Extract metadata from multiple images (max 50). Price: $${PRICING.basic.price}-${PRICING.premium.price} USDC via x402`,
          inputSchema: {
            type: 'object',
            properties: {
              imageUrls: {
                type: 'array',
                items: { type: 'string' },
                maxItems: 50,
              },
              options: {
                type: 'object',
                properties: {
                  includeGps: { type: 'boolean' },
                  includeColor: { type: 'boolean' },
                },
              },
              paymentHeader: {
                type: 'string',
                description: 'x402 payment header (if paying for access)',
              },
              payer: {
                type: 'string',
                description: 'Caller wallet address (for freemium tracking)',
              },
            },
            required: ['imageUrls'],
          },
        },
        {
          name: 'detect_image_manipulation',
          description: `Analyze image for manipulation signs. Price: $${PRICING.standard.price}-${PRICING.forensic.price} USDC via x402`,
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: { type: 'string' },
              analysisLevel: {
                type: 'string',
                enum: ['basic', 'standard', 'forensic'],
                default: 'standard',
              },
              paymentHeader: {
                type: 'string',
                description: 'x402 payment header (if paying for access)',
              },
              payer: {
                type: 'string',
                description: 'Caller wallet address (for freemium tracking)',
              },
            },
            required: ['imageUrl'],
          },
        },
        {
          name: 'get_pricing',
          description: 'Get current pricing for image metadata extraction tiers',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
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
            content: [
              {
                type: 'text',
                text: JSON.stringify({ 
                  pricing: PRICING,
                  freemium: {
                    limit: 50,
                    remaining: freemium.remaining,
                  }
                }, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Image Metadata Server running on stdio');
  }

  main().catch(console.error);
}