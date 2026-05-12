# MCP Image Metadata

## Tagline
Extract EXIF, GPS, IPTC, XMP metadata from any image with freemium and x402 USDC payments.

## Description
MCP Image Metadata is a Model Context Protocol server that extracts rich metadata from images. It provides EXIF data (camera make/model, ISO, aperture, shutter speed), GPS coordinates, IPTC fields (keywords, captions, copyright), and XMP metadata. Features include 50 free requests per wallet, x402 payment integration for USDC, batch processing up to 50 images, manipulation detection for forensic analysis, and automatic file cleanup after processing. Perfect for AI agents, stock photo platforms, e-commerce product listings, marketing agencies, and digital forensics.

## Setup Requirements
- No required environment variables for basic usage.
- `PORT` (optional): HTTP server port. Default: runs in stdio mode if not set.
- `X402_API_KEY` (optional): xpay API key for payment processing. Get from https://facilitator.xpay.sh
- `X402_WALLET_ADDRESS` (optional): Your Base USDC wallet address to receive payments.
- `X402_NETWORK` (optional): base or base-sepolia. Default: base-sepolia.
- `FREEMIUM_LIMIT` (optional): Number of free requests per wallet. Default: 50.

## Category
Content & Media

## Use Cases
Image metadata extraction, Photo provenance verification, GPS location extraction, Copyright detection, AI vision model enrichment, E-commerce product listings, Digital forensics, Stock photo platforms, Marketing analytics

## Features
- EXIF extraction (camera make/model, lens, ISO, aperture, shutter speed, focal length, date/time)
- GPS data extraction (latitude, longitude, altitude)
- IPTC metadata (keywords, captions, headline, credit, copyright, city, country)
- XMP metadata (creator, title, description, rating, labels)
- File information (dimensions, format, color depth, DPI, file size)
- Color profile detection
- Image manipulation detection (basic, standard, forensic levels)
- Batch processing up to 50 images
- Freemium model (50 free requests per wallet)
- x402 payment integration for USDC
- Automatic file cleanup after extraction
- Path traversal protection
- MIME type validation
- Rate limiting (100 req/min per IP)
- CORS configuration support
- Security event logging

## Getting Started
- "Extract metadata from my uploaded image" — Uploads and extracts all available metadata
- "Check if this image has been edited or manipulated" — Analyzes image for signs of editing
- "Get pricing information for this MCP server" — Returns pricing tiers and freemium status
- Tool: extract_image_metadata — Extract EXIF, GPS, IPTC, XMP from a single image
- Tool: extract_batch_metadata — Extract metadata from multiple images (max 50)
- Tool: detect_image_manipulation — Analyze image for manipulation signs
- Tool: get_pricing — Get current pricing and freemium status

## Tags
mcp, metadata, exif, gps, iptc, xmp, image, photos, media, x402, payments, usdc, blockchain, ai, tools

## Documentation URL
https://github.com/jicoing/mcp-image-metadata#readme

## Health Check URL
https://mcp-image-metadata.onrender.com/health