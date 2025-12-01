import LZString from 'lz-string';

/**
 * Compress data for transmission
 * @param data - The data to compress
 * @returns Compressed string
 */
export function compressData<T>(data: T): string {
  const jsonString = JSON.stringify(data);
  return LZString.compressToBase64(jsonString);
}

/**
 * Decompress data after transmission
 * @param compressed - The compressed string
 * @returns Original data
 */
export function decompressData<T>(compressed: string): T {
  const jsonString = LZString.decompressFromBase64(compressed);
  if (!jsonString) {
    throw new Error('Failed to decompress data');
  }
  return JSON.parse(jsonString);
}

/**
 * Calculate size reduction percentage
 * @param original - Original data
 * @param compressed - Compressed string
 * @returns Percentage of size reduction
 */
export function getCompressionRatio(original: any, compressed: string): number {
  const originalSize = JSON.stringify(original).length;
  const compressedSize = compressed.length;
  return ((originalSize - compressedSize) / originalSize) * 100;
}
