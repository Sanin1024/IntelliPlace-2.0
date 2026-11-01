import { prisma } from '../config/prisma.js';
import fs from 'fs';
import path from 'path';

export const MAX_SIZE_MB = async () => {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'RESUME_MAX_SIZE_MB' } });
    if (setting?.value) {
      const val = parseInt(setting.value, 10);
      if (!isNaN(val) && val > 0) return val;
    }
  } catch {
    // Fallback if DB unreachable
  }
  return 5;
};

const PDF_MAGIC = Buffer.from('%PDF');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // DOCX = zip

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: 'pdf' | 'docx';
}

/**
 * Content-based validation (Challenge 101/103). Never trusts the extension:
 * magic bytes decide the type; the declared MIME must agree; the structure
 * must be readable. Executables and everything else are rejected.
 */
export function validateResumeBuffer(buf: Buffer, declaredMime: string, originalName: string): ValidationResult {
  if (buf.length < 100) return { valid: false, error: 'File is too small to be a valid document.' };

  if (buf.subarray(0, 4).equals(PDF_MAGIC)) {
    if (declaredMime !== 'application/pdf') {
      return { valid: false, error: 'File content is PDF but was sent as a different type — re-save the file as PDF and try again.' };
    }
    const tail = buf.subarray(Math.max(0, buf.length - 2048)).toString('latin1');
    if (!tail.includes('%%EOF')) {
      return { valid: false, error: 'This PDF appears incomplete or corrupted (missing document end-marker). Re-export it and try again.' };
    }
    if (buf.toString('latin1').includes('/Encrypt')) {
      return { valid: false, error: 'Password-protected PDFs are not supported. Remove the password and re-upload.' };
    }
    return { valid: true, detectedType: 'pdf' };
  }

  if (buf.subarray(0, 4).equals(ZIP_MAGIC)) {
    if (declaredMime !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return { valid: false, error: 'File content is DOCX but was sent as a different type — save the file as .docx and try again.' };
    }
    // Encrypted-entry check (Challenge 103): general-purpose flag bit 0 on local headers
    const latin = buf.toString('latin1');
    let idx = 0;
    while ((idx = latin.indexOf('PK\x03\x04', idx)) !== -1) {
      if (idx + 8 <= buf.length && (buf.readUInt16LE(idx + 6) & 0x0001) === 1) {
        return { valid: false, error: 'This document is password-protected/encrypted. Remove protection and re-upload.' };
      }
      idx += 4;
    }
    if (!latin.includes('word/document.xml')) {
      return { valid: false, error: 'This file is a ZIP archive but not a valid Word document (.docx).' };
    }
    return { valid: true, detectedType: 'docx' };
  }

  // Executable / script rejection with a clear message (Challenge 101)
  const exe = buf.subarray(0, 2).toString('latin1') === 'MZ';
  return {
    valid: false,
    error: exe
      ? 'Executable files are not allowed. Only PDF and DOCX resumes are accepted.'
      : `Unsupported file format${originalName ? ` ("${path.extname(originalName) || 'unknown'}")` : ''}. Only PDF and DOCX are supported.`,
  };
}

/** Storage layout: uploads/resumes/<studentId>/<key> — keys are opaque, never derived from user input. */
export const resumeDir = (studentId: string) => path.join(process.cwd(), 'uploads', 'resumes', studentId);

export function ensureDir(dir: string) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

export function safeUnlink(p?: string | null) {
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch { /* best-effort */ }
}
