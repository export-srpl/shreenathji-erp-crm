/**
 * Document storage utilities
 * For now, we'll use a simple file system approach
 * In production, this should be replaced with S3, Azure Blob, or similar
 */

import { writeFile, mkdir, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads', 'documents');

/**
 * Ensure upload directory exists
 */
export async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Save uploaded file
 */
export async function saveDocument(
  file: Buffer,
  filename: string,
  entityType: string,
  entityId: string,
): Promise<{ filePath: string; fileUrl: string }> {
  await ensureUploadDir();

  // Create entity-specific directory
  const entityDir = join(UPLOAD_DIR, entityType, entityId);
  if (!existsSync(entityDir)) {
    await mkdir(entityDir, { recursive: true });
  }

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFilename = `${timestamp}_${sanitizedFilename}`;
  const filePath = join(entityDir, uniqueFilename);

  await writeFile(filePath, file);

  // Generate URL (in production, this would be a CDN URL)
  const fileUrl = `/api/documents/file/${entityType}/${entityId}/${uniqueFilename}`;

  return { filePath, fileUrl };
}

/**
 * Get document file
 */
export async function getDocument(filePath: string): Promise<Buffer> {
  return await readFile(filePath);
}

/**
 * Delete document file
 */
export async function deleteDocument(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

/**
 * Get file size
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await import('fs/promises').then((m) => m.stat(filePath));
  return stats.size;
}

