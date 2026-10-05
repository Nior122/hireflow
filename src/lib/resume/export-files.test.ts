import { exportResumePdf, exportResumeDocx } from './export-files';
test('PDF has cross reference and no HTML', () => {
 const pdf = Buffer.from(exportResumePdf('Jane Doe\nEngineer')).toString();
 expect(pdf).toMatch(/^%PDF-1.4/); expect(pdf).toContain('xref\n'); expect(pdf).toContain('(Jane Doe) Tj');
});
test('DOCX is a zip containing a Word document', () => {
 const doc = Buffer.from(exportResumeDocx('Jane & Doe')).toString();
 expect(doc.slice(0,2)).toBe('PK'); expect(doc).toContain('word/document.xml'); expect(doc).toContain('Jane &amp; Doe');
});
