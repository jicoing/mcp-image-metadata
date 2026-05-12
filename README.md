# MCP Image Metadata Server

MCP server for extracting rich metadata from images, monetized via x402 payments.

## Features

- **EXIF extraction** - Camera make/model, lens, ISO, aperture, shutter speed, focal length
- **GPS data** - Latitude, longitude, altitude
- **IPTC/XMP** - Keywords, captions, copyright, credit
- **File info** - Dimensions, format, color depth, DPI, file size
- **Color analysis** - Color profile detection
- **Manipulation detection** - Analyze images for signs of editing
- **Freemium** - 50 free requests per wallet
- **x402 payments** - Accept USDC for paid requests

## Quick Start

### Local (Stdio)

```bash
npm install
npm run build
npm run dev
```

### Docker

```bash
docker build -t mcp-image-metadata .
docker run -p 3000:3000 mcp-image-metadata
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port (optional) | stdio mode |
| `X402_FACILITATOR_URL` | x402 payment relay | https://facilitator.xpay.sh |
| `X402_API_KEY` | xpay API key | - |
| `X402_WALLET_ADDRESS` | Your Base USDC wallet | - |
| `X402_NETWORK` | base or base-sepolia | base-sepolia |
| `FREEMIUM_LIMIT` | Free requests per wallet | 50 |

## HTTP API

When `PORT` is set, the server runs as an HTTP API:

### Endpoints

```
POST /mcp    - MCP JSON-RPC
GET  /health - Health check
```

### Example Usage

```bash
# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Extract metadata
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "extract_image_metadata",
      "arguments": {
        "imageUrl": "https://example.com/photo.jpg",
        "payer": "0xYourWalletAddress"
      }
    }
  }'
```

### Available Tools

| Tool | Description | Price |
|------|-------------|-------|
| `extract_image_metadata` | Extract EXIF, GPS, IPTC, XMP | $0.002 USDC |
| `extract_batch_metadata` | Batch extract up to 50 images | $0.001-$0.005 USDC |
| `detect_image_manipulation` | Analyze for manipulation signs | $0.002-$0.015 USDC |
| `get_pricing` | Get current pricing tiers | Free |

## Deployment

### Render

1. Push to GitHub
2. Connect repo on [render.com](https://render.com)
3. Uses `render.yaml` - auto-configured

### Railway

```bash
npm install -g railway
railway login
railway init
railway deploy
```

### Fly.io

```bash
fly launch
fly deploy
```

## Pricing

| Tier | Price | Includes |
|------|-------|----------|
| Basic | $0.001 | File info, dimensions, color profile |
| Standard | $0.002 | Basic + GPS, IPTC, XMP, keywords |
| Premium | $0.005 | Standard + OCR, thumbnail, deep hash |
| Forensic | $0.015 | Premium + manipulation analysis |

## Freemium

- First 50 requests free per wallet address
- After 50, requires x402 payment
- Usage tracked in memory

## x402 Payment Flow

1. Agent calls tool with `paymentHeader` (x402 payment string)
2. Server verifies via xpay facilitator
3. If valid, returns metadata; if invalid, returns error
4. USDC transfers to your wallet on Base

## Tech Stack

- Node.js 20+
- TypeScript
- @modelcontextprotocol/sdk
- Sharp (image processing)
- ExifReader (metadata parsing)
- Express (HTTP server)

## License

MIT