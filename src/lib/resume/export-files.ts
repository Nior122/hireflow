import { resumeToText } from './ats';

export function exportResumeText(resume: { title: string; summary: string; sections: any[] }): string {
  return resumeToText(resume);
}
function xml(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function crc32(buf: Buffer) {
  let c = -1;
  for (const b of buf) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); }
  return (c ^ -1) >>> 0;
}
function zip(files: Record<string, string>): Uint8Array {
  const locals: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const n = Buffer.from(name), b = Buffer.from(content), crc = crc32(b);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20,4); h.writeUInt32LE(crc,14); h.writeUInt32LE(b.length,18); h.writeUInt32LE(b.length,22); h.writeUInt16LE(n.length,26);
    locals.push(h,n,b);
    const d = Buffer.alloc(46); d.writeUInt32LE(0x02014b50); d.writeUInt16LE(20,4); d.writeUInt16LE(20,6); d.writeUInt32LE(crc,16); d.writeUInt32LE(b.length,20); d.writeUInt32LE(b.length,24); d.writeUInt16LE(n.length,28); d.writeUInt32LE(offset,42);
    central.push(d,n); offset += h.length+n.length+b.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(Object.keys(files).length,8); end.writeUInt16LE(Object.keys(files).length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,directory,end]);
}
export function exportResumeDocx(text: string): Uint8Array {
  const paragraphs = text.split(/\r?\n/).map(line => `<w:p><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join('');
  return zip({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`,
  });
}
export function exportResumePdf(text: string): Uint8Array {
  const esc = (s: string) => s.replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
  const lines = text.split(/\r?\n/).flatMap(l => l.match(/.{1,90}/g) ?? ['']);
  const pages: string[][] = []; for (let i=0;i<lines.length;i+=48) pages.push(lines.slice(i,i+48));
  if (!pages.length) pages.push([]);
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const pageRefs: string[] = [];
  for (const page of pages) {
    const pageId = objects.length+1, contentId=pageId+1;
    pageRefs.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    const stream = `BT /F1 10 Tf 50 750 Td 14 TL ${page.map((line,i) => `${i?'T* ':''}(${esc(line)}) Tj`).join(' ')} ET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${pageRefs.length} >>`;
  let output = '%PDF-1.4\n'; const offsets=[0];
  objects.forEach((o,i) => { offsets.push(Buffer.byteLength(output)); output += `${i+1} 0 obj\n${o}\nendobj\n`; });
  const xref=Buffer.byteLength(output); output+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}
