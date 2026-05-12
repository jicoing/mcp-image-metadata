# MCP Image Metadata Extraction Server

A Model Context Protocol server for extracting rich metadata from images, monetized via x402.

---

## Overview

This MCP server provides AI agents and applications with comprehensive image metadata extraction capabilities, exposed as tools they can call to analyze any image file.

**Key selling points:**
- EXIF, IPTC, XMP, GPS, and file metadata in one call
- Support for 100+ image formats (JPEG, PNG, TIFF, WebP, HEIC, RAW, etc.)
- Batch processing for large volumes
- Instant payments via x402 (no accounts, no friction)

---

## Capabilities

### 1. Core Metadata Extraction

| Category | Data Extracted |
|----------|----------------|
| **EXIF** | Camera make/model, lens, ISO, aperture, shutter speed, focal length, date/time, flash, white balance, exposure mode |
| **GPS** | Latitude, longitude, altitude, GPS timestamp, location name (reverse geocoding optional) |
| **File** | Dimensions (W×H), format, color depth, bit depth, DPI, file size, MIME type |
| **Color** | Color profile (sRGB, Adobe RGB, etc.), dominant colors, ICC profile presence |
| **IPTC** | Keywords, caption/description, headline, credit, copyright, city, country, By-line, By-lineTitle |
| **XMP** | Creator, title, description, rating, labels, tags, history, rating |
| **GIF/WebP** | Frame count, animation duration, loop count |

### 2. Optional Add-ons

| Feature | Description | Price Modifier |
|---------|-------------|----------------|
| **OCR Text** | Extract visible text from images (Tesseract) | +50% |
| **Thumbnail** | Generate preview thumbnail | +25% |
| **Geocoding** | Convert GPS coords to address | +100% |
| **Deep Hash** | SHA256/PHash for duplicate detection | +20% |
| **Format Validation** | Verify format integrity, detect corruption | +10% |

---

## Tool Interface (MCP Schema)

```json
{
  "tools": [
    {
      "name": "extract_image_metadata",
      "description": "Extract all available metadata from an image file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "imageUrl": {
            "type": "string",
            "description": "URL or file path to the image"
          },
          "includeOptions": {
            "type": "object",
            "properties": {
              "includeGps": { "type": "boolean", "default": true },
              "includeColor": { "type": "boolean", "default": true },
              "includeThumbnail": { "type": "boolean", "default": false },
              "includeOcr": { "type": "boolean", "default": false },
              "includeDeepHash": { "type": "boolean", "default": false }
            }
          }
        },
        "required": ["imageUrl"]
      }
    },
    {
      "name": "extract_batch_metadata",
      "description": "Extract metadata from multiple images in a single request",
      "inputSchema": {
        "type": "object",
        "properties": {
          "imageUrls": {
            "type": "array",
            "items": { "type": "string" },
            "maxItems": 50
          },
          "options": {
            "type": "object",
            "properties": {
              "includeGps": { "type": "boolean" },
              "includeColor": { "type": "boolean" }
            }
          }
        },
        "required": ["imageUrls"]
      }
    },
    {
      "name": "detect_image_manipulation",
      "description": "Analyze an image for signs of manipulation or editing",
      "inputSchema": {
        "type": "object",
        "properties": {
          "imageUrl": { "type": "string" },
          "analysisLevel": {
            "type": "string",
            "enum": ["basic", "standard", "forensic"],
            "default": "standard"
          }
        },
        "required": ["imageUrl"]
      }
    }
  ]
}
```

---

## API & Endpoints

```
POST /extract          - Extract metadata from single image
POST /batch            - Extract metadata from multiple images (max 50)
POST /analyze          - Deep analysis for manipulation detection
GET  /formats/supported - List supported image formats
GET  /pricing          - Current pricing for each tier
```

---

## x402 Pricing Integration

### Pricing Tiers

| Tier | Price | Includes |
|------|-------|----------|
| **Basic** | $0.001 | EXIF, file info, dimensions, color profile |
| **Standard** | $0.002 | Basic + GPS, IPTC, XMP, keywords |
| **Premium** | $0.005 | Standard + OCR, thumbnail, deep hash |
| **Forensic** | $0.015 | Premium + manipulation analysis, full EXIF history |

### Batch Discount

| Quantity | Discount |
|----------|----------|
| 1-10 | 0% |
| 11-50 | 10% |
| 51-100 | 20% |
| 100+ | 30% |

### Example x402 Integration (Express)

```javascript
import express from 'express';
import { paymentMiddleware } from '@coinbase/x402-express';
import { extractMetadata } from './lib/metadata';

const app = express();

app.use(paymentMiddleware({
  '/extract': {
    accepts: ['USDC', 'USDT'],
    price: {
      'basic':      '0.001',
      'standard':   '0.002',
      'premium':    '0.005',
      'forensic':   '0.015',
    },
    per: 'request',
  },
  '/batch': {
    accepts: ['USDC', 'USDT'],
    price: (req) => {
      const count = req.body.imageUrls?.length || 1;
      const rate = count >= 100 ? 0.001 * 0.7 : 
                   count >= 50  ? 0.001 * 0.8 : 
                   count >= 10  ? 0.001 * 0.9 : 0.001;
      return String((rate * count).toFixed(4));
    },
  },
}));

app.post('/extract', async (req, res) => {
  const result = await extractMetadata(req.body.imageUrl, req.body.options);
  res.json({ success: true, data: result });
});

app.listen(3000);
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 18+ |
| **HTTP Framework** | Express / Fastify / Hono |
| **Image Processing** | Sharp (primary), exiftool-vendored (extended) |
| **EXIF Parsing** | exiftool-vendored |
| **OCR** | tesseract.js |
| **Payments** | @coinbase/x402-express |
| **MCP SDK** | @modelcontextprotocol/sdk |
| **Validation** | Zod |
| **Testing** | Vitest |
| **Deployment** | Docker, Railway, Fly.io, AWS Lambda |

---

## Project Structure

```
mcp-image-metadata/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── handlers/
│   │   ├── extract.ts        # Metadata extraction handler
│   │   ├── batch.ts          # Batch processing handler
│   │   └── analyze.ts        # Manipulation detection handler
│   ├── lib/
│   │   ├── exif.ts           # EXIF extraction logic
│   │   ├── gps.ts            # GPS/geo utilities
│   │   ├── ocr.ts            # OCR integration
│   │   ├── colors.ts         # Color analysis
│   │   └── hash.ts           # Deep hashing
│   ├── pricing.ts            # x402 pricing logic
│   └── types.ts              # TypeScript interfaces
├── tests/
│   ├── extract.test.ts
│   └── batch.test.ts
├── Dockerfile
├── package.json
├── tsconfig.json
└── README.md
```

---

## Target Customers

| Customer | Use Case |
|----------|----------|
| **Stock Photo Platforms** | Verify provenance, detect stripped metadata |
| **Legal/Forensics Firms** | Authenticate evidence, detect manipulation |
| **Journalists** | Verify source/authenticity of photos |
| **Marketing Agencies** | Extract keywords, captions for SEO |
| **E-commerce** | Extract product photos' EXIF for listings |
| **Compliance Teams** | Ensure copyright metadata is preserved |
| **AI Developers** | Power vision models with enriched metadata |

---

## Monetization Strategy

### 1. Pay-per-Request
- Simple x402 micro-payment per extraction
- No subscription required, agent pays on-demand

### 2. Freemium Tier
- 50 free extractions/month for API exploration
- Upgrade to paid for higher volume

### 3. Enterprise Subscription
- $99/month for 50,000 extractions
- SLA, dedicated support, custom format handling

### 4. Add-on Marketplace
- Offer premium features (forensic analysis, geocoding)
- Agents discover and unlock add-ons via x402

---

## Getting Started

```bash
# Clone template
git clone https://github.com/your-org/mcp-image-metadata.git
cd mcp-image-metadata

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your payment config

# Run in development
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Deploy with Docker
docker build -t mcp-image-metadata .
docker run -p 3000:3000 mcp-image-metadata
```

---

## Environment Variables

```bash
# x402 Configuration
X402_PAYMENT_URL=https://pay.x402.dev
X402_WALLET_ADDRESS=0x...           # Your receiving wallet
X402_WALLET_PRIVATE_KEY=0x...      # For signing receipts

# Optional: Geocoding API (for GPS reverse lookup)
GEOCODING_API_KEY=

# Optional: Tesseract language packs
TESSERACT_LANG=eng
```

---

## Roadmap

- [ ] Core EXIF/IPTC/XMP extraction
- [ ] GPS coordinates and basic metadata
- [ ] Batch processing (up to 50 images)
- [ ] OCR text extraction
- [ ] Manipulation detection (forensic analysis)
- [ ] Geocoding (reverse GPS to address)
- [ ] Thumbnail generation
- [ ] Perceptual hashing for duplicate detection
- [ ] Webhook notifications for large batch completion
- [ ] Web dashboard for usage analytics

---

## Resources

- [Model Context Protocol SDK](https://modelcontextprotocol.io)
- [x402 Documentation](https://x402.org)
- [Sharp Documentation](https://sharp.pixelplumbing.com)
- [Exiftool](https://exiftool.org)
- [Example MCP Servers](https://github.com/modelcontextprotocol/servers)