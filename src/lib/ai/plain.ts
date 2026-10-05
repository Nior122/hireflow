/** Convert model-produced HTML to readable text; never render model markup. */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*?>|&(?:nbsp|amp|lt|gt|quot|#\d+);/i.test(value);
}
export function toPlainText(value: string): string {
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|#160);/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/\n{3,}/g, '\n\n').trim();
}

/** Preserve valid structured JSON (including fenced JSON), sanitize all prose. */
export function plainGroqReply(content: string): string {
  const trimmed = content.trim();
  const unwrapped = trimmed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```$/, '').trim();
  try {
    const parsed = JSON.parse(unwrapped);
    if (parsed !== null && typeof parsed === 'object') return content;
  } catch { /* freeform prose */ }
  return toPlainText(content);
}
