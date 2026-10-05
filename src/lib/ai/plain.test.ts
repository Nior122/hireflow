import { toPlainText, looksLikeHtml } from './plain';
test('converts markup to plain text', () => {
 expect(looksLikeHtml('<p>Hello</p>')).toBe(true);
 expect(toPlainText('<p>Hello &amp; welcome</p><p>Next</p>')).toBe('Hello & welcome\nNext');
});
