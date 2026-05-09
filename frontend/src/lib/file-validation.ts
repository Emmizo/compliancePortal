export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set<string>([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

export const ACCEPT_ATTRIBUTE = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt';

export interface FileValidationFailure {
  ok: false;
  reason: string;
}
export interface FileValidationSuccess {
  ok: true;
}
export type FileValidationResult = FileValidationFailure | FileValidationSuccess;

export function validateDocument(file: File | undefined | null): FileValidationResult {
  if (!file) {
    return { ok: false, reason: 'Please choose a file to upload' };
  }
  if (file.size <= 0) {
    return { ok: false, reason: 'The selected file is empty' };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      ok: false,
      reason: `File is ${formatBytes(file.size)}, which exceeds the ${formatBytes(MAX_DOCUMENT_BYTES)} limit`,
    };
  }
  const mime = file.type || guessMimeFromName(file.name);
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(mime)) {
    return {
      ok: false,
      reason: 'Only PDF, Word, Excel, PNG, JPG, or plain text files are accepted',
    };
  }
  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx'))
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsx'))
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}
