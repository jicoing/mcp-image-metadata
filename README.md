# MCP Image Metadata Server

MCP server for extracting rich metadata from images, monetized via x402 payments.

## Live Demo

**Server:** https://mcp-image-metadata.onrender.com

---

## Quick Start

### 1. Upload Image

```bash
curl -X POST https://mcp-image-metadata.onrender.com/upload \
  -F "image=@your-image.jpg"
```

**Response:**
```json
{
  "success": true,
  "filePath": "/tmp/uploads/abc123.jpg",
  "fileName": "abc123.jpg",
  "originalName": "your-image.jpg",
  "size": 12345
}
```

### 2. Extract Metadata

```bash
curl -X POST https://mcp-image-metadata.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "extract_image_metadata",
      "arguments": {
        "imageUrl": "/tmp/uploads/abc123.jpg",
        "payer": "0xYourWalletAddress"
      }
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "width": 1920,
      "height": 1080,
      "format": "jpeg",
      "colorDepth": 3,
      "dpi": 72,
      "fileSize": 456789,
      "mimeType": "image/jpeg"
    },
    "exif": {
      "cameraMake": "Apple",
      "cameraModel": "iPhone 14 Pro",
      "dateTime": "2024:01:15 12:30:00"
    },
    "gps": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "price": 0.002,
  "paymentStatus": "free",
  "freemiumRemaining": 49
}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST | MCP JSON-RPC interface |
| `/upload` | POST | Upload image file |
| `/health` | GET | Health check |

---

## MCP Tools

### 1. extract_image_metadata

Extract EXIF, GPS, IPTC, XMP metadata from an image.

**Arguments:**
```json
{
  "imageUrl": "/tmp/uploads/abc123.jpg",
  "includeOptions": {
    "includeGps": true,
    "includeColor": true,
    "includeThumbnail": false,
    "includeOcr": false,
    "includeDeepHash": false
  },
  "paymentHeader": "...",
  "payer": "0xYourWallet"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "file": {...}, "exif": {...}, "gps": {...} },
  "price": 0.002,
  "paymentStatus": "free",
  "freemiumRemaining": 50
}
```

---

### 2. extract_batch_metadata

Extract metadata from multiple images (max 50).

**Arguments:**
```json
{
  "imageUrls": ["/tmp/uploads/1.jpg", "/tmp/uploads/2.jpg"],
  "options": { "includeGps": true },
  "paymentHeader": "...",
  "payer": "0xYourWallet"
}
```

---

### 3. detect_image_manipulation

Analyze image for signs of manipulation/editing.

**Arguments:**
```json
{
  "imageUrl": "/tmp/uploads/abc123.jpg",
  "analysisLevel": "standard",
  "paymentHeader": "...",
  "payer": "0xYourWallet"
}
```

**analysisLevel:**
- `basic` - Basic checks ($0.002)
- `standard` - Standard analysis ($0.002)
- `forensic` - Deep forensic analysis ($0.015)

---

### 4. get_pricing

Get current pricing tiers and freemium status.

**Arguments:**
```json
{
  "payer": "0xYourWallet"
}
```

**Response:**
```json
{
  "pricing": {
    "basic": { "tier": "basic", "price": 0.001 },
    "standard": { "tier": "standard", "price": 0.002 },
    "premium": { "tier": "premium", "price": 0.005 },
    "forensic": { "tier": "forensic", "price": 0.015 }
  },
  "freemium": { "limit": 50, "remaining": 49 }
}
```

---

## Complete Usage Flow

### Step 1: Upload Image

```bash
# Upload image
curl -X POST https://mcp-image-metadata.onrender.com/upload \
  -F "image=@photo.jpg"
```

Response:
```json
{
  "success": true,
  "filePath": "/tmp/uploads/abc123.jpg"
}
```

### Step 2: Extract Metadata

```bash
curl -X POST https://mcp-image-metadata.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "extract_image_metadata",
      "arguments": {
        "imageUrl": "/tmp/uploads/abc123.jpg",
        "payer": "0xYourWallet123"
      }
    }
  }'
```

### Step 3: Get Updated Freemium Status

```bash
curl -X POST https://mcp-image-metadata.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_pricing",
      "arguments": {
        "payer": "0xYourWallet123"
      }
    }
  }'
```

---

## Pricing

| Tier | Price | Description |
|------|-------|-------------|
| Basic | $0.001 USDC | File info, dimensions, color profile |
| Standard | $0.002 USDC | Basic + GPS, IPTC, XMP |
| Premium | $0.005 USDC | Standard + thumbnail, deep hash |
| Forensic | $0.015 USDC | Premium + manipulation analysis |

---

## Freemium

- **50 free requests** per wallet address
- After 50, requires x402 payment
- Usage tracked in memory (resets on server restart)

---

## x402 Payment Integration

### For Agents/Apps

To make paid requests, include the `paymentHeader`:

```json
{
  "name": "extract_image_metadata",
  "arguments": {
    "imageUrl": "/tmp/uploads/abc123.jpg",
    "payer": "0xYourWallet",
    "paymentHeader": "payment=v1_USDC_..."
  }
}
```

### Payment Flow

1. Agent calls tool with x402 payment header
2. Server verifies payment via xpay facilitator
3. If valid → returns metadata
4. If invalid → returns error
5. USDC transfers to your wallet on Base

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | stdio mode |
| `NODE_ENV` | Environment | development |
| `X402_FACILITATOR_URL` | x402 payment relay | https://facilitator.xpay.sh |
| `X402_API_KEY` | xpay API key | - |
| `X402_WALLET_ADDRESS` | Your Base USDC wallet | - |
| `X402_NETWORK` | base or base-sepolia | base-sepolia |
| `FREEMIUM_LIMIT` | Free requests per wallet | 50 |

---

## Deployment

### Render (Recommended)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Configure:

| Setting | Value |
|---------|-------|
| Name | mcp-image-metadata |
| Region | Oregon |
| Build Command | `npm install && npm run build` |
| Start Command | `node dist/index.js` |

5. Add Environment Variables (see above)
6. Deploy

---

## Local Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run (stdio mode)
npm run dev

# Run with HTTP server
PORT=3000 node dist/index.js
```

---

## Supported Image Formats

- JPEG/JPG
- PNG
- GIF
- WebP
- TIFF
- HEIC
- BMP
- SVG

---

## Tech Stack

- Node.js 20+
- TypeScript
- @modelcontextprotocol/sdk
- Sharp (image processing)
- ExifReader (metadata parsing)
- Express (HTTP server)
- Multer (file uploads)

---

## License

MIT