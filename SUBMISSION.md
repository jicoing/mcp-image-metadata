# MCP Server Submission Templates

## Server Details

- **Name:** MCP Image Metadata
- **Description:** Extract EXIF, GPS, IPTC, XMP metadata from images. Freemium 50 requests, x402 USDC payments.
- **GitHub:** https://github.com/jicoing/mcp-image-metadata
- **Live URL:** https://mcp-image-metadata.onrender.com
- **Category:** Images/Media

---

## MCP Marketplace (mcp-marketplace.io)

### Basic Info
- **Service Name:** MCP Image Metadata
- **Category:** Images & Media
- **Service Provider:** (Your name/handle)
- **Price:** Freemium (50 free, then $0.002 USDC)

### Use Cases
- Extract EXIF metadata from photos
- Get GPS location data from images
- Analyze image file properties
- Detect image manipulation
- Batch process multiple images

### Description (50-300 chars)
Extract rich metadata (EXIF, GPS, IPTC, XMP) from any image. 50 free requests, then pay with USDC via x402. Perfect for AI agents, photo platforms, and developers.

### Configuration (STDIO)
```json
{
  "command": "node",
  "args": ["dist/index.js"]
}
```

### For HTTP/Render:
```json
{
  "command": "npx",
  "args": ["-y", "mcp-image-metadata"],
  "env": {
    "PORT": "3000"
  }
}
```

---

## AgenticMarket (agenticmarket.dev)

### Submit Fields
- **Name:** image-metadata
- **Description:** Extract EXIF, GPS, IPTC, XMP from images with freemium
- **Long Description:** See README.md
- **MCP Server URL:** https://mcp-image-metadata.onrender.com/mcp
- **Category:** Productivity
- **Price per call:** $0.01 (1 cent) - or freemium model

---

## MCP Central (mcpcentral.io)

### Create server.json
```json
{
  "name": "io.github.jicoing/mcp-image-metadata",
  "version": "1.0.0",
  "description": "Extract EXIF, GPS, IPTC, XMP metadata from images with x402 payments",
  "repository": {
    "url": "https://github.com/jicoing/mcp-image-metadata"
  },
  "homepage": "https://mcp-image-metadata.onrender.com",
  "languages": ["typescript", "javascript"],
  "transport": "http",
  "remotes": [
    {
      "url": "https://mcp-image-metadata.onrender.com/mcp",
      "description": "Production HTTP endpoint"
    }
  ]
}
```

### Publish Command
```bash
npm install -g mcp-publisher
mcp-publisher login github --registry https://registry.mcpcentral.io
mcp-publisher publish
```

---

## MCPFind (mcpfind.org)

### Submit Form
- **Package Name:** mcp-image-metadata
- **GitHub URL:** https://github.com/jicoing/mcp-image-metadata
- **Category:** Images & Media

---

## MCPize (mcpize.com)

For monetization (85% revenue share):
1. Go to https://mcpize.com/marketplace
2. Submit server
3. Configure pricing
4. Earn USDC per call

---

## Claude Desktop Config

```json
{
  "mcpServers": {
    "image-metadata": {
      "command": "npx",
      "args": ["-y", "mcp-image-metadata"],
      "env": {
        "PORT": "3000"
      }
    }
  }
}
```

---

## Cursor Config

```json
{
  "mcpServers": {
    "image-metadata": {
      "command": "npx",
      "args": ["-y", "mcp-image-metadata"],
      "env": {
        "PORT": "3000"
      }
    }
  }
}
```

---

## Recommended Submission Order

1. **MCPFind** (free, easy, no review)
2. **MCP Central** (official, good visibility)
3. **MCP Marketplace** (curated, security-focused)
4. **AgenticMarket** (monetization option)
5. **MCPize** (monetization - 85% revenue)