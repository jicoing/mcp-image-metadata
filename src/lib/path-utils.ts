import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = '/tmp/uploads';

export function validateFilePath(filePath: string, allowedBaseDir?: string): boolean {
  const baseDir = allowedBaseDir || UPLOAD_DIR;
  
  try {
    const normalized = path.normalize(filePath);
    const resolved = path.resolve(normalized);
    const allowedResolved = path.resolve(baseDir);
    
    if (!resolved.startsWith(allowedResolved)) {
      return false;
    }
    
    if (resolved.includes('..')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export function sanitizeFilePath(filePath: string): string {
  const normalized = path.normalize(filePath);
  const resolved = path.resolve(normalized);
  const baseResolved = path.resolve(UPLOAD_DIR);
  
  if (!resolved.startsWith(baseResolved)) {
    return path.join(baseResolved, path.basename(resolved));
  }
  
  return resolved;
}

export function isSafeFilePath(filePath: string, allowedBaseDir?: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  
  const dangerousPatterns = ['../', '..\\', '%2e%2e', '..', '~'];
  const lowerPath = filePath.toLowerCase();
  
  for (const pattern of dangerousPatterns) {
    if (lowerPath.includes(pattern)) {
      return false;
    }
  }
  
  return validateFilePath(filePath, allowedBaseDir);
}

export function cleanupFile(imagePath: string): void {
  if (isSafeFilePath(imagePath)) {
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch {
      console.error(`Failed to cleanup file: ${imagePath}`);
    }
  }
}
