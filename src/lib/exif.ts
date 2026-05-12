import ExifReader from 'exifreader';
import sharp from 'sharp';
import type {
  ImageMetadata,
  ExifData,
  GpsData,
  ColorData,
  IptcData,
  XmpData,
} from '../types.js';

interface RawExifTags {
  [key: string]: unknown;
}

function getStringFromTag(tag: unknown): string | undefined {
  if (tag && typeof tag === 'object' && 'description' in (tag as Record<string, unknown>)) {
    return String((tag as Record<string, unknown>).description);
  }
  return undefined;
}

function getNumberFromTag(tag: unknown): number | undefined {
  if (tag && typeof tag === 'object' && 'value' in (tag as Record<string, unknown>)) {
    return Number((tag as Record<string, unknown>).value);
  }
  return undefined;
}

function extractExif(tags: Record<string, unknown>): ExifData {
  return {
    cameraMake: getStringFromTag(tags.Make),
    cameraModel: getStringFromTag(tags.Model),
    lens: getStringFromTag(tags.LensModel),
    iso: getNumberFromTag(tags.ISOSpeedRatings),
    aperture: getStringFromTag(tags.FNumber),
    shutterSpeed: getStringFromTag(tags.ExposureTime),
    focalLength: getStringFromTag(tags.FocalLength),
    dateTime: getStringFromTag(tags.DateTimeOriginal),
    flash: getStringFromTag(tags.Flash),
    whiteBalance: getStringFromTag(tags.WhiteBalance),
    exposureMode: getStringFromTag(tags.ExposureMode),
  };
}

function extractGps(tags: Record<string, unknown>): GpsData | undefined {
  const getCoord = (tag: unknown): number | undefined => {
    if (!tag || typeof tag !== 'object') return undefined;
    const obj = tag as Record<string, unknown>;
    if ('values' in obj && Array.isArray(obj.values)) {
      const vals = obj.values as Array<{ value: number }>;
      if (vals.length >= 3) {
        const deg = vals[0].value;
        const min = vals[1].value;
        const sec = vals[2].value;
        return deg + min / 60 + sec / 3600;
      }
    }
    return undefined;
  };

  const lat = getCoord(tags.GPSLatitude);
  const lon = getCoord(tags.GPSLongitude);
  const alt = tags.GPSAltitude ? getNumberFromTag(tags.GPSAltitude) : undefined;

  if (lat === undefined || lon === undefined) return undefined;

  const latRef = getStringFromTag(tags.GPSLatitudeRef);
  const lonRef = getStringFromTag(tags.GPSLongitudeRef);

  return {
    latitude: latRef === 'S' ? -lat : lat,
    longitude: lonRef === 'W' ? -lon : lon,
    altitude: alt,
    gpsTimestamp: getStringFromTag(tags.GPSTimeStamp),
  };
}

function extractIptc(tags: Record<string, unknown>): IptcData {
  return {
    keywords: tags.Keywords ? [getStringFromTag(tags.Keywords)].filter(Boolean) as string[] : undefined,
    caption: getStringFromTag(tags.Caption),
    headline: getStringFromTag(tags.Headline),
    credit: getStringFromTag(tags.Credit),
    copyright: getStringFromTag(tags.Copyright),
    city: getStringFromTag(tags.City),
    country: getStringFromTag(tags.Country),
    byline: getStringFromTag(tags.Byline),
    bylineTitle: getStringFromTag(tags.BylineTitle),
  };
}

function extractXmp(tags: Record<string, unknown>): XmpData {
  return {
    creator: getStringFromTag(tags.creator),
    title: getStringFromTag(tags.title),
    description: getStringFromTag(tags.description),
    rating: getNumberFromTag(tags.rating),
    labels: tags.labels ? [getStringFromTag(tags.labels)].filter(Boolean) as string[] : undefined,
    tags: tags.tags ? [getStringFromTag(tags.tags)].filter(Boolean) as string[] : undefined,
  };
}

export async function extractMetadata(
  imagePath: string,
  options: {
    includeGps?: boolean;
    includeColor?: boolean;
    includeThumbnail?: boolean;
    includeOcr?: boolean;
    includeDeepHash?: boolean;
  } = {}
): Promise<ImageMetadata> {
  const buffer = await sharp(imagePath).toBuffer();
  const tags = ExifReader.load(buffer);

  const fileInfo = await sharp(imagePath).metadata();

  const metadata: ImageMetadata = {
    file: {
      width: fileInfo.width || 0,
      height: fileInfo.height || 0,
      format: fileInfo.format || 'unknown',
      colorDepth: fileInfo.channels,
      dpi: fileInfo.density,
      fileSize: buffer.length,
      mimeType: `image/${fileInfo.format}`,
    },
  };

  if (tags.exif) {
    metadata.exif = extractExif(tags.exif as unknown as Record<string, unknown>);
  }

  if (options.includeGps && tags.gps) {
    metadata.gps = extractGps(tags.gps as unknown as Record<string, unknown>);
  }

  if (options.includeColor) {
    const hasIccProfile = !!fileInfo.icc;
    metadata.color = {
      colorProfile: fileInfo.icc ? 'Embedded' : undefined,
      hasIccProfile,
    };
  }

  if (tags.iptc) {
    metadata.iptc = extractIptc(tags.iptc as unknown as Record<string, unknown>);
  }

  if (tags.xmp) {
    metadata.xmp = extractXmp(tags.xmp as unknown as Record<string, unknown>);
  }

  if (fileInfo.pages) {
    metadata.animation = {
      frameCount: fileInfo.pages,
    };
  }

  if (options.includeThumbnail) {
    const thumbnailBuffer = await sharp(imagePath)
      .resize(200, 200, { fit: 'inside' })
      .toBuffer();
    metadata.thumbnail = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
  }

  if (options.includeDeepHash) {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    metadata.deepHash = hash;
  }

  return metadata;
}

export async function detectManipulation(
  imagePath: string,
  analysisLevel: 'basic' | 'standard' | 'forensic' = 'standard'
): Promise<{ isManipulated: boolean; confidence: number; details: string[] }> {
  const details: string[] = [];
  let manipulationScore = 0;

  const buffer = await sharp(imagePath).toBuffer();
  const tags = ExifReader.load(buffer);

  if (tags.exif) {
    const exif = tags.exif as unknown as Record<string, unknown>;
    
    if (exif.Software && analysisLevel !== 'basic') {
      details.push(`Software: ${String(exif.Software)}`);
      manipulationScore += 10;
    }

    if (exif.ModifyDate && exif.DateTimeOriginal) {
      const modifyDate = getStringFromTag(exif.ModifyDate);
      const origDate = getStringFromTag(exif.DateTimeOriginal);
      if (modifyDate && origDate && modifyDate !== origDate) {
        details.push('EXIF modification date differs from original');
        manipulationScore += 30;
      }
    }
  }

  const stats = await sharp(imagePath).stats();
  if (stats.channels) {
    const channelVariances = stats.channels.map(ch => {
      const mean = ch.mean || 0;
      const std = (ch as { stdev?: number }).stdev || 0;
      return std / (mean || 1);
    });

    const variance = channelVariances.reduce((a, b) => a + b, 0) / channelVariances.length;
    if (variance > 10 && analysisLevel === 'forensic') {
      details.push('Unusual channel variance detected');
      manipulationScore += 20;
    }
  }

  const confidence = Math.min(manipulationScore, 100);
  return {
    isManipulated: manipulationScore > 50,
    confidence,
    details,
  };
}