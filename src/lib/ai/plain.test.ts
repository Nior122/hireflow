import { toPlainText, looksLikeHtml, plainGroqReply } from './plain';
test('converts markup to plain text', () => {
 expect(looksLikeHtml('<p>Hello</p>')).toBe(true);
 expect(toPlainText('<p>Hello &amp; welcome</p><p>Next</p>')).toBe('Hello & welcome\nNext');
});

test('preserves structured JSON and strips HTML from prose', () => {
  expect(plainGroqReply('{"summary":"<b>bold</b>"}')).toBe('{"summary":"<b>bold</b>"}');
  expect(plainGroqReply('```json\n{"found":[]}\n```')).toContain('"found"');
  expect(plainGroqReply('<p>Hire <b>me</b></p>')).toBe('Hire me');
});
