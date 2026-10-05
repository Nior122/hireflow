/** Convert model-produced HTML to readable text; never render model markup. */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*?>|&(?:nbsp|amp|lt|gt|quot|#\d+);/i.test(value);
}
export function toPlainText(value: string): string {
  return value.replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|#160);/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/\n{3,}/g, '\n\n').trim();
}
