export interface StoredDocument {
  // Prisma's JSON input expects an indexable object. Keep document values JSON primitives.
  [key: string]: string | number;
  id: string;
  name: string;
  mime: string;
  size: number;
  base64: string;
}
export const MAX_DOCUMENT_SIZE = 1_500_000;
const allowed = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg', 'image/webp']);
export function validateDocument(name: string, mime: string, bytes: Uint8Array): void {
  if (!name || name.length > 180 || !allowed.has(mime) || bytes.length === 0 || bytes.length > MAX_DOCUMENT_SIZE) throw new Error('Unsupported file or file exceeds 1.5 MB');
  const prefix = Buffer.from(bytes.subarray(0, 8));
  if (mime === 'application/pdf' && !prefix.toString().startsWith('%PDF-')) throw new Error('Invalid PDF');
  if (mime.includes('wordprocessingml') && prefix.subarray(0, 2).toString() !== 'PK') throw new Error('Invalid DOCX');
  if (mime === 'image/png' && prefix.toString('hex').slice(0,16) !== '89504e470d0a1a0a') throw new Error('Invalid PNG');
  if (mime === 'image/jpeg' && prefix.toString('hex').slice(0,4) !== 'ffd8') throw new Error('Invalid JPEG');
  if (mime === 'image/webp' && (prefix.toString('ascii',0,4) !== 'RIFF')) throw new Error('Invalid WebP');
}
export function documentsFromJson(value: unknown): StoredDocument[] {
  return Array.isArray(value) ? value.filter(d => d && typeof d.id === 'string' && typeof d.base64 === 'string' && typeof d.name === 'string') : [];
}
