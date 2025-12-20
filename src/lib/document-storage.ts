/**
 * Document storage utilities using Vercel Blob Storage
 */

import { put, del, head } from '@vercel/blob';

/**
 * Save uploaded file to Vercel Blob Storage
 */
export async function saveDocument(
  file: Buffer,
  filename: string,
  entityType: string,
  entityId: string,
): Promise<{ filePath: string; fileUrl: string }> {
  // Generate unique filename with timestamp and entity info
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFilename = `${entityType}/${entityId}/${timestamp}_${sanitizedFilename}`;

  // Upload to Vercel Blob Storage
  const blob = await put(uniqueFilename, file, {
    access: 'public',
    contentType: getContentType(filename),
  });

  // Return blob URL and path for database storage
  return {
    filePath: blob.pathname, // Store the blob pathname for reference
    fileUrl: blob.url, // Public URL from Vercel Blob
  };
}

/**
 * Delete document from Vercel Blob Storage
 */
export async function deleteDocument(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
  } catch (error) {
    console.error('Failed to delete blob:', error);
    // Don't throw - allow deletion to continue even if blob deletion fails
  }
}

/**
 * Get document file from Vercel Blob Storage
 * Note: With Vercel Blob, files are accessed via public URLs, so this function
 * fetches the file from the blob URL
 */
export async function getDocument(blobUrl: string): Promise<Buffer> {
  const response = await fetch(blobUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document from blob: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get file size from Vercel Blob Storage
 */
export async function getFileSize(blobUrl: string): Promise<number> {
  try {
    const blobInfo = await head(blobUrl);
    return blobInfo.size;
  } catch (error) {
    console.error('Failed to get blob size:', error);
    return 0;
  }
}

/**
 * Helper function to determine content type from filename
 */
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const contentTypeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return contentTypeMap[extension || ''] || 'application/octet-stream';
}

